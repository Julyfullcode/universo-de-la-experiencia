"use strict";

const { Pool } = require("pg");
const { HttpError } = require("./admin-security");
let pool;

function getPool(config) {
  if (!pool) {
    const url = new URL(config.ADMIN_DATABASE_URL);
    if (!/^universo_admin_backend(?:\.[a-z0-9]+)?$/.test(url.username)) throw new Error("Use the restricted administrative database role");
    // URL sslmode options can override pg's ssl object; require strict verification.
    ["sslmode", "sslcert", "sslkey", "sslrootcert"].forEach((name) => url.searchParams.delete(name));
    pool = new Pool({ connectionString: url.toString(), max: 3, connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000, statement_timeout: 5000, query_timeout: 6000,
      ssl: { rejectUnauthorized: true, ...(config.ADMIN_DATABASE_CA ? { ca: config.ADMIN_DATABASE_CA } : {}) } });
    pool.on("error", () => console.error(JSON.stringify({ event: "admin_database_connection_error" })));
  }
  return pool;
}

async function transaction(poolInstance, fn) {
  const client = await poolInstance.connect();
  try {
    await client.query("begin");
    const value = await fn(client);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
}

// Account risk causes a CAPTCHA, not a continuously renewable account-wide ban.
function dimensions(context) {
  return [
    { key: `ip:${context.ipHash}`, limit: 20, block: true },
    { key: `device:${context.deviceHash}`, limit: 10, block: true },
    { key: `pair:${context.userHash}:${context.ipHash}`, limit: 10, block: true },
    { key: `user:${context.userHash}`, limit: Infinity, riskLimit: 10, block: false },
    { key: "global", limit: 300, block: false },
  ].sort((a, b) => a.key.localeCompare(b.key));
}

async function lockGuards(client, context) {
  const rows = [];
  for (const dimension of dimensions(context)) {
    await client.query("select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1, 20261009))", [dimension.key]);
    await client.query(`insert into universo_private.admin_guards (key, expires_at)
      values ($1, clock_timestamp() + interval '24 hours') on conflict (key) do nothing`, [dimension.key]);
    const { rows: [row] } = await client.query(`select *, clock_timestamp() as now
      from universo_private.admin_guards where key = $1 for update`, [dimension.key]);
    rows.push({ ...dimension, ...row });
  }
  return rows;
}

function rateDecision(rows) {
  let retryAfter = 0;
  let captchaRequired = false;
  for (const row of rows) {
    const now = new Date(row.now).getTime();
    const start = new Date(row.window_started).getTime();
    const requests = now - start >= 60000 ? 0 : row.requests;
    const activeFailures = new Date(row.expires_at).getTime() > now ? row.failures : 0;
    if (activeFailures >= 3 || requests >= (row.riskLimit || Infinity)) captchaRequired = true;
    if (row.block && row.blocked_until && new Date(row.blocked_until).getTime() > now) {
      retryAfter = Math.max(retryAfter, Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000));
    }
    if (requests >= row.limit) retryAfter = Math.max(retryAfter, Math.max(1, Math.ceil((start + 60000 - now) / 1000)));
  }
  return { retryAfter, captchaRequired };
}

async function reserveAttempt(poolInstance, context) {
  return transaction(poolInstance, async (client) => {
    const rows = await lockGuards(client, context);
    const decision = rateDecision(rows);
    // Rejected requests never renew the penalty or the window.
    if (!decision.retryAfter) {
      for (const row of rows) {
        await client.query(`update universo_private.admin_guards set
          requests = case when window_started <= clock_timestamp() - interval '1 minute' then 1 else requests + 1 end,
          window_started = case when window_started <= clock_timestamp() - interval '1 minute' then clock_timestamp() else window_started end
          where key = $1`, [row.key]);
      }
    }
    return decision;
  });
}

function penalty(failures, strikes) {
  if (failures >= 5) return [60, 300, 900][Math.min(strikes, 2)];
  return [0, 1, 2, 4, 8][failures] || 0;
}

async function recordFailure(poolInstance, context) {
  return transaction(poolInstance, async (client) => {
    const rows = await lockGuards(client, context);
    let retryAfter = 0;
    let maxFailures = 0;
    for (const row of rows) {
      if (row.key === "global") continue;
      const now = new Date(row.now).getTime();
      const expired = new Date(row.expires_at).getTime() <= now;
      const failures = (expired ? 0 : row.failures) + 1;
      const strikes = expired ? 0 : row.strikes;
      const activeBlock = row.blocked_until && new Date(row.blocked_until).getTime() > now;
      const seconds = row.block && !activeBlock ? penalty(failures, strikes) : 0;
      maxFailures = Math.max(maxFailures, failures);
      retryAfter = Math.max(retryAfter, seconds);
      await client.query(`update universo_private.admin_guards set
        failures = $2, strikes = $3,
        blocked_until = case when $4 > 0 then clock_timestamp() + $4 * interval '1 second' else blocked_until end,
        expires_at = case when $5 then clock_timestamp() + interval '24 hours' else expires_at end
        where key = $1`, [row.key, failures, strikes + (seconds >= 60 ? 1 : 0), seconds, expired]);
    }
    return { retryAfter, maxFailures };
  });
}

async function resetAfterSuccess(client, context) {
  // Lock with the same order used by all attempts. Do not reset IP/global rate budgets.
  const rows = await lockGuards(client, context);
  for (const row of rows) {
    if (row.key === "global" || row.key.startsWith("ip:")) continue;
    await client.query(`update universo_private.admin_guards
      set failures = 0, strikes = 0, blocked_until = null where key = $1`, [row.key]);
  }
}

async function audit(poolInstance, context, event, detail = {}, alert = false) {
  const result = await transaction(poolInstance, async (client) => {
    const { rows: [entry] } = await client.query(`insert into universo_private.admin_events
      (event, ip_hash, user_hash, device_hash, request_id, detail) values ($1,$2,$3,$4,$5,$6) returning id`,
    [event, context.ipHash, context.userHash, context.deviceHash, context.requestId, JSON.stringify(detail)]);
    if (alert) {
      const key = `alert:${event}:${context.userHash}`;
      await client.query("select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1, 20261009))", [key]);
      const recent = await client.query(`select 1 from universo_private.admin_alerts a
        join universo_private.admin_events e on e.id = a.event_id
        where e.event = $1 and e.user_hash = $2 and a.created_at > clock_timestamp() - interval '15 minutes' limit 1`, [event, context.userHash]);
      if (!recent.rowCount) await client.query("insert into universo_private.admin_alerts (event_id) values ($1)", [entry.id]);
    }
    return entry.id;
  });
  console.info(JSON.stringify({ event, request_id: context.requestId, event_id: result }));
}

async function deliverAlerts(poolInstance, config, fetcher = fetch, limit = 10) {
  const crypto = require("node:crypto");
  return transaction(poolInstance, async (client) => {
    const pending = await client.query(`select a.id, a.attempts, e.event, e.occurred_at, e.user_hash, e.request_id, e.detail
      from universo_private.admin_alerts a join universo_private.admin_events e on e.id = a.event_id
      where a.sent_at is null and a.next_attempt_at <= clock_timestamp()
      order by a.id limit $1 for update of a skip locked`, [limit]);
    for (const row of pending.rows) {
      const body = JSON.stringify({ source: "universo-admin", alert_id: row.id, event: row.event,
        occurred_at: row.occurred_at, user_hash: row.user_hash, request_id: row.request_id, detail: row.detail });
      const signature = crypto.createHmac("sha256", config.ADMIN_ALERT_WEBHOOK_KEY).update(body).digest("hex");
      let sent = false;
      try {
        const response = await fetcher(config.ADMIN_ALERT_WEBHOOK_URL, { method: "POST",
          headers: { "Content-Type": "application/json", "X-Universe-Signature": signature },
          body, redirect: "error", signal: AbortSignal.timeout(2000) });
        sent = response.ok;
      } catch { /* Keep the outbox for retries; never grant access on a delivery failure. */ }
      await client.query(`update universo_private.admin_alerts set attempts = attempts + 1,
        sent_at = case when $2 then clock_timestamp() else null end,
        next_attempt_at = clock_timestamp() + least(3600, 30 * power(2, least(attempts, 7))) * interval '1 second'
        where id = $1`, [row.id, sent]);
    }
    return pending.rowCount;
  });
}

async function cleanup(client) {
  await client.query("delete from universo_private.admin_challenges where expires_at < clock_timestamp() - interval '1 day'");
  await client.query("delete from universo_private.admin_guards where expires_at < clock_timestamp() - interval '1 day'");
  // Preserve undelivered alerts, and cap ordinary audit retention at 30 days.
  await client.query(`delete from universo_private.admin_events e where occurred_at < clock_timestamp() - interval '30 days'
    and not exists (select 1 from universo_private.admin_alerts a where a.event_id = e.id and a.sent_at is null)`);
}

module.exports = { getPool, transaction, dimensions, rateDecision, penalty, reserveAttempt,
  recordFailure, resetAfterSuccess, audit, deliverAlerts, cleanup, HttpError };
