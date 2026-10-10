"use strict";

const S = require("./admin-security");
const Store = require("./admin-store");
const crypto = require("node:crypto");

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function createHandler(dependencies = {}) {
  const fetcher = dependencies.fetch || fetch;
  const store = { ...Store, ...dependencies.store };
  return async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("X-Universe-Admin", "1");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.setHeader("Allow", "POST");
    let config, pool, context;
    try {
      config = S.requireConfig(dependencies.env || process.env);
      const body = S.validateRequest(request, config);
      const action = String(request.query?.action || new URL(request.url, config.origin).pathname.split("/").pop());
      if (!["status", "login", "mfa", "panel", "delete", "logout"].includes(action)) throw new S.HttpError(404, "NOT_FOUND", "Ruta no disponible.");
      const ip = S.clientIp(request, dependencies.env || process.env);
      const incoming = S.cookies(request);
      const device = S.unsign(config, incoming[S.COOKIE.device], "device") || S.randomToken();
      S.setCookie(response, S.COOKIE.device, S.sign(config, device, "device"), 30 * 86400);
      const username = action === "login" && typeof body.username === "string" ? body.username.trim().toUpperCase() : "unknown";
      context = { ipHash: S.pseudonym(config, `ip:${ip}`), userHash: S.pseudonym(config, `user:${username}`),
        deviceHash: S.pseudonym(config, `device:${device}`), requestId: crypto.randomUUID() };
      pool = dependencies.pool || store.getPool(config);
      const audit = async (event, detail = {}, alert = false) => {
        await store.audit(pool, context, event, detail, alert);
        if (alert) {
          try { await store.deliverAlerts(pool, config, fetcher, 1); }
          catch { console.error(JSON.stringify({ event: "admin_alert_delivery_error", request_id: context.requestId })); }
        }
      };
      const session = S.unsign(config, incoming[S.COOKIE.session], "session");

      if (action === "status") {
        if (!S.exactKeys(body, [])) throw new S.HttpError(400, "ARGUMENTS", "Solicitud no válida.");
        let authenticated = false;
        if (session) {
          const { rows: [row] } = await pool.query("select universo_private.admin_sesion_vigente($1) as valid", [session]);
          authenticated = row.valid === true;
        }
        return send(response, 200, { ok: true, authenticated, captcha_provider: config.captchaProvider, captcha_site_key: config.TURNSTILE_SITE_KEY || "" });
      }

      if (action === "login") {
        if (!S.exactKeys(body, ["username", "password", "captcha_token"]) || !username || username.length > 64
            || typeof body.password !== "string" || body.password.length < 8 || Buffer.byteLength(body.password, "utf8") > 72
            || typeof body.captcha_token !== "string" || body.captcha_token.length > 2048) {
          throw new S.HttpError(400, "ARGUMENTS", "Revisa los datos de ingreso.");
        }
        const decision = await store.reserveAttempt(pool, context);
        if (decision.retryAfter) {
          await audit("login_rate_limited", {}, true);
          throw new S.HttpError(429, "RATE_LIMIT", "Espera antes de volver a intentar.", { retry_after: decision.retryAfter });
        }
        if (config.captchaProvider === "turnstile" && decision.captchaRequired && !body.captcha_token) {
          throw new S.HttpError(403, "CAPTCHA_REQUIRED", "Completa la verificación para continuar.", { captcha_required: true });
        }
        // BotID checks every login; account/IP/device risk still controls escalation and penalties.
        let captchaValid = true;
        try {
          if (config.captchaProvider === "botid") captchaValid = await S.verifyBotId(dependencies.checkBotId);
          else if (decision.captchaRequired || body.captcha_token) captchaValid = await S.verifyCaptcha(config, body.captcha_token, ip, fetcher);
        } catch {
          throw new S.HttpError(503, "CAPTCHA_UNAVAILABLE", "La verificación está temporalmente indisponible.");
        }
        if (!captchaValid) {
          await store.recordFailure(pool, context);
          await audit("captcha_failed", {}, true);
          throw new S.HttpError(403, "CAPTCHA_REQUIRED", "La verificación venció o no es válida. Inténtala nuevamente.", { captcha_required: true });
        }
        const { rows: [row] } = await pool.query("select universo_private.admin_verificar_password($1, $2) as result", [username, body.password]);
        if (!row.result.ok) {
          const failure = await store.recordFailure(pool, context);
          await audit("password_failed", { failures: failure.maxFailures }, failure.maxFailures >= 3);
          throw new S.HttpError(401, "INVALID_CREDENTIALS", "No fue posible validar el ingreso.",
            { retry_after: failure.retryAfter, captcha_required: failure.maxFailures >= 3 });
        }
        const challenge = S.randomToken();
        await pool.query(`insert into universo_private.admin_challenges
          (token_hash, usuario, device_hash, mfa_ciphertext, expires_at)
          values ($1, $2, $3, $4, clock_timestamp() + interval '5 minutes')`,
        [S.digest(challenge), row.result.usuario, context.deviceHash, row.result.mfa_ciphertext]);
        S.setCookie(response, S.COOKIE.challenge, S.sign(config, challenge, "challenge"), 300);
        await audit("mfa_requested");
        return send(response, 200, { ok: true, mfa_required: true });
      }

      if (action === "mfa") {
        if (!S.exactKeys(body, ["code"]) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
          throw new S.HttpError(400, "ARGUMENTS", "Ingresa el código de seis dígitos.");
        }
        const challenge = S.unsign(config, incoming[S.COOKIE.challenge], "challenge");
        if (!challenge) throw new S.HttpError(401, "MFA_EXPIRED", "Vuelve a ingresar tu usuario y contraseña.");
        // First look up only the bound challenge's identity for the shared rate limits.
        const lookup = await pool.query(`select usuario from universo_private.admin_challenges
          where token_hash = $1 and device_hash = $2 and consumed_at is null and expires_at > clock_timestamp()`,
        [S.digest(challenge), context.deviceHash]);
        if (!lookup.rowCount) throw new S.HttpError(401, "MFA_EXPIRED", "Vuelve a ingresar tu usuario y contraseña.");
        context.userHash = S.pseudonym(config, `user:${lookup.rows[0].usuario}`);
        const decision = await store.reserveAttempt(pool, context);
        if (decision.retryAfter) {
          await audit("mfa_rate_limited", {}, true);
          throw new S.HttpError(429, "RATE_LIMIT", "Espera antes de volver a intentar.", { retry_after: decision.retryAfter });
        }
        const result = await store.transaction(pool, async (client) => {
          const { rows: [entry] } = await client.query(`select *, clock_timestamp() as now from universo_private.admin_challenges
            where token_hash = $1 and device_hash = $2 for update`, [S.digest(challenge), context.deviceHash]);
          if (!entry || entry.consumed_at || entry.attempts >= 5 || new Date(entry.expires_at) <= new Date(entry.now)) return null;
          await client.query("update universo_private.admin_challenges set attempts = attempts + 1 where token_hash = $1", [S.digest(challenge)]);
          const counter = S.verifyTotp(S.decryptSecret(entry.mfa_ciphertext, config.mfaKey), body.code);
          if (counter === null) return null;
          const { rows: [row] } = await client.query("select universo_private.admin_crear_sesion($1, $2) as result", [entry.usuario, counter]);
          if (!row.result.ok) return null;
          await client.query("update universo_private.admin_challenges set consumed_at = clock_timestamp() where token_hash = $1", [S.digest(challenge)]);
          return row.result;
        });
        if (!result) {
          const failure = await store.recordFailure(pool, context);
          await audit("mfa_failed", { failures: failure.maxFailures }, true);
          throw new S.HttpError(401, "MFA_INVALID", "El código no es válido o el intento venció.", { retry_after: failure.retryAfter });
        }
        await store.transaction(pool, (client) => store.resetAfterSuccess(client, context));
        await audit("login_succeeded");
        S.setCookie(response, S.COOKIE.session, S.sign(config, result.token, "session"), 8 * 3600);
        S.setCookie(response, S.COOKIE.challenge, "", 0);
        return send(response, 200, { ok: true });
      }

      if (!session) throw new S.HttpError(401, "SESSION_EXPIRED", "Sesión inválida o vencida.");
      if (action === "panel" || action === "logout") {
        if (!S.exactKeys(body, [])) throw new S.HttpError(400, "ARGUMENTS", "Solicitud no válida.");
        const query = action === "panel" ? "select public.universo_admin_panel($1) as result" : "select public.universo_admin_salir($1) as result";
        const { rows: [row] } = await pool.query(query, [session]);
        if (action === "logout") {
          S.setCookie(response, S.COOKIE.session, "", 0);
          S.setCookie(response, S.COOKIE.challenge, "", 0);
          await audit("logout");
        }
        return send(response, 200, row.result);
      }
      if (action === "delete") {
        if (!S.exactKeys(body, ["trip_id"]) || typeof body.trip_id !== "string"
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.trip_id)) {
          throw new S.HttpError(400, "ARGUMENTS", "Viaje no válido.");
        }
        const { rows: [row] } = await pool.query("select public.universo_admin_eliminar_viaje($1, $2::uuid) as result", [session, body.trip_id]);
        await audit("trip_deleted", { trip_id: body.trip_id });
        return send(response, 200, row.result);
      }
    } catch (error) {
      if (error?.code === "28000") {
        S.setCookie(response, S.COOKIE.session, "", 0);
        return send(response, 401, { code: "SESSION_EXPIRED", message: "Sesión inválida o vencida." });
      }
      if (error instanceof S.HttpError) {
        if (error.extra.retry_after) response.setHeader("Retry-After", String(error.extra.retry_after));
        return send(response, error.status, { code: error.code, message: error.message, ...error.extra });
      }
      console.error(JSON.stringify({ event: "admin_service_error", request_id: context?.requestId }));
      return send(response, 503, { code: "ADMIN_UNAVAILABLE", message: "El acceso administrativo está temporalmente indisponible." });
    }
  };
}

module.exports = { createHandler };
