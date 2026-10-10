"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const Store = require("../server/admin-store");
const S = require("../server/admin-security");
const { createHandler } = require("../server/admin-handler");

// PGlite runs the actual PostgreSQL engine and pgcrypto locally. Its single
// connection is serialized to model transaction boundaries, not SQL results.
function poolAdapter(db) {
  let gate = Promise.resolve();
  async function acquire() {
    const previous = gate;
    let release;
    gate = new Promise((resolve) => { release = resolve; });
    await previous;
    return release;
  }
  async function query(sql, params) {
    const result = await db.query(sql, params);
    return { ...result, rowCount: result.affectedRows || result.rows.length };
  }
  return {
    async connect() {
      const release = await acquire();
      return { query, release };
    },
    async query(sql, params) {
      const release = await acquire();
      try { return await query(sql, params); } finally { release(); }
    },
  };
}

function req(action, body, cookie = "") {
  return { method: "POST", query: { action }, url: `/api/admin/${action}`, body,
    headers: { origin: "https://universo.example.com", "content-type": "application/json",
      "x-universo-admin": "1", "x-forwarded-for": "203.0.113.10", cookie } };
}
function res() {
  const headers = {};
  return { statusCode: 200, headers, setHeader(key, value) { headers[key] = value; }, getHeader(key) { return headers[key]; },
    end(body) { this.body = JSON.parse(body); } };
}
function updateCookies(jar, result) {
  for (const value of result.headers["Set-Cookie"] || []) {
    const [name, raw] = value.split(";")[0].split("=");
    jar[name] = raw;
  }
  return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join("; ");
}

test("PostgreSQL migration, throttling and complete administrative flow", { timeout: 120000 }, async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const pool = poolAdapter(db);
  const root = path.resolve(__dirname, "..");
  const config = S.requireConfig({ VERCEL: "1", ADMIN_DATABASE_URL: "postgres://universo_admin_backend:example@localhost/postgres",
    ADMIN_COOKIE_KEY: crypto.randomBytes(32).toString("base64"), ADMIN_MFA_KEY: crypto.randomBytes(32).toString("base64"),
    ADMIN_ALLOWED_ORIGIN: "https://universo.example.com", TURNSTILE_SITE_KEY: "production-site-key",
    TURNSTILE_SECRET_KEY: "example-secret", ADMIN_ALERT_WEBHOOK_URL: "https://alerts.example.com/ingest",
    ADMIN_ALERT_WEBHOOK_KEY: "example-alert-key", CRON_SECRET: "example-cron-key" });
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const context = { ipHash: "ip-a", userHash: "user-a", deviceHash: "device-a", requestId: crypto.randomUUID() };
  try {
    await db.exec("create role anon; create role authenticated; grant usage on schema public to anon, authenticated;");
    await db.exec(fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8"));
    for (const name of fs.readdirSync(path.join(root, "supabase/migrations")).sort()) {
      await db.exec(fs.readFileSync(path.join(root, "supabase/migrations", name), "utf8"));
    }
    await db.query(`update public.universo_admin_config set
      password_hash = extensions.crypt('known-admin-password', extensions.gen_salt('bf', 4)), mfa_ciphertext = $1 where singleton`,
    [S.encryptSecret(secret, config.mfaKey)]);

    await t.test("migration is idempotent and keeps public execution revoked", async () => {
      await db.exec(fs.readFileSync(path.join(root, "supabase/migrations/20261009120000_admin_segregado.sql"), "utf8"));
      for (const role of ["anon", "authenticated"]) {
        await pool.query(`set role ${role}`);
        for (const call of ["public.universo_admin_ingresar('VPEUC','known-admin-password')", "public.universo_admin_panel('bad')",
          "public.universo_admin_salir('bad')", "universo_private.admin_verificar_password('VPEUC','known-admin-password')"]) {
          await assert.rejects(pool.query(`select ${call}`), { code: "42501" });
        }
        await pool.query("reset role");
      }
      await pool.query("set role universo_admin_backend");
      await assert.rejects(pool.query("select public.universo_admin_ingresar('VPEUC','known-admin-password')"), { code: "42501" });
      await assert.rejects(pool.query("select password_hash from public.universo_admin_config"), { code: "42501" });
    });

    await t.test("private password check uses bcrypt and cannot issue a session", async () => {
      const correct = await pool.query("select universo_private.admin_verificar_password($1,$2) as result", ["VPEUC", "known-admin-password"]);
      const wrong = await pool.query("select universo_private.admin_verificar_password($1,$2) as result", ["VPEUC", "wrong-password"]);
      const missing = await pool.query("select universo_private.admin_verificar_password($1,$2) as result", ["NONEXISTENT", "known-admin-password"]);
      assert.equal(correct.rows[0].result.ok, true);
      assert.equal(correct.rows[0].result.token, undefined);
      assert.equal(wrong.rows[0].result.ok, false);
      assert.equal(missing.rows[0].result.ok, false);
    });

    await t.test("parallel reservations obey shared device and pair budgets", async () => {
      const attempts = await Promise.all(Array.from({ length: 25 }, () => Store.reserveAttempt(pool, context)));
      assert.equal(attempts.filter((result) => result.retryAfter === 0).length, 10);
      assert.equal(attempts.filter((result) => result.retryAfter > 0).length, 15);
    });

    await t.test("rejected requests do not prolong a block and new origins face CAPTCHA", async () => {
      await pool.query("delete from universo_private.admin_guards");
      for (let i = 0; i < 5; i++) {
        await pool.query("update universo_private.admin_guards set blocked_until = clock_timestamp() - interval '1 second'");
        await Store.recordFailure(pool, context);
      }
      const before = await pool.query("select key, blocked_until from universo_private.admin_guards order by key");
      for (let i = 0; i < 5; i++) assert.ok((await Store.reserveAttempt(pool, context)).retryAfter > 0);
      const after = await pool.query("select key, blocked_until from universo_private.admin_guards order by key");
      assert.deepEqual(after.rows, before.rows);
      const otherOrigin = await Store.reserveAttempt(pool, { ...context, ipHash: "ip-b", deviceHash: "device-b" });
      assert.equal(otherOrigin.retryAfter, 0);
      assert.equal(otherOrigin.captchaRequired, true);
      await pool.query("update universo_private.admin_guards set blocked_until = clock_timestamp() - interval '1 second', window_started = clock_timestamp() - interval '2 minutes'");
      assert.equal((await Store.reserveAttempt(pool, context)).retryAfter, 0);
    });

    await t.test("the real HTTP flow grants a cookie only after MFA, and rejects replay", async () => {
      await pool.query("delete from universo_private.admin_guards");
      const handler = createHandler({ env: config, pool });
      const jar = {};
      const login = res();
      await handler(req("login", { username: "VPEUC", password: "known-admin-password", captcha_token: "" }), login);
      assert.equal(login.statusCode, 200);
      assert.equal(login.body.mfa_required, true);
      let cookie = updateCookies(jar, login);
      const originalChallengeCookie = cookie;
      const noSession = res();
      await handler(req("panel", {}, cookie), noSession);
      assert.equal(noSession.statusCode, 401);
      const code = S.totp(secret).generate();
      const mfa = res();
      await handler(req("mfa", { code }, cookie), mfa);
      assert.equal(mfa.statusCode, 200);
      assert.equal(mfa.body.token, undefined);
      assert.ok(mfa.headers["Set-Cookie"].some((value) => value.startsWith(`${S.COOKIE.session}=`) && value.includes("HttpOnly; Secure; SameSite=Strict")));
      cookie = updateCookies(jar, mfa);
      const token = S.unsign(config, jar[S.COOKIE.session], "session");
      try { await pool.query("select public.universo_admin_panel($1)", [token]); }
      catch (error) { assert.fail(`Panel SQL failed: ${error.code} ${error.message}`); }
      const panel = res();
      await handler(req("panel", {}, cookie), panel);
      assert.equal(panel.statusCode, 200);
      assert.ok(panel.body.resumen);
      const replay = res();
      await handler(req("mfa", { code }, originalChallengeCookie), replay);
      assert.equal(replay.statusCode, 401);
      const repeatedCounter = await pool.query("select universo_private.admin_crear_sesion($1,$2) as result", ["VPEUC", Math.floor(Date.now() / 30000)]);
      assert.equal(repeatedCounter.rows[0].result.ok, false);
      const logout = res();
      await handler(req("logout", {}, cookie), logout);
      assert.equal(logout.statusCode, 200);
      const expired = res();
      await handler(req("panel", {}, cookie), expired);
      assert.equal(expired.statusCode, 401);
    });

    await t.test("audit alerts are grouped, signed and queued for retry", async () => {
      await Store.audit(pool, context, "test_failed_attempt", { failures: 5 }, true);
      await Store.audit(pool, context, "test_failed_attempt", { failures: 6 }, true);
      const queued = await pool.query("select count(*)::int as count from universo_private.admin_alerts");
      assert.equal(queued.rows[0].count, 1);
      await Store.deliverAlerts(pool, config, async () => ({ ok: false }));
      let pending = await pool.query("select attempts, sent_at from universo_private.admin_alerts");
      assert.equal(pending.rows[0].attempts, 1);
      assert.equal(pending.rows[0].sent_at, null);
      await pool.query("update universo_private.admin_alerts set next_attempt_at = clock_timestamp()");
      await Store.deliverAlerts(pool, config, async (_url, options) => {
        assert.equal(options.headers["X-Universe-Signature"], crypto.createHmac("sha256", config.ADMIN_ALERT_WEBHOOK_KEY).update(options.body).digest("hex"));
        assert.equal(options.body.includes("known-admin-password"), false);
        return { ok: true };
      });
      pending = await pool.query("select sent_at from universo_private.admin_alerts");
      assert.ok(pending.rows[0].sent_at);
      await Store.transaction(pool, Store.cleanup);
    });
  } finally { await db.close(); }
});
