"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const S = require("../server/admin-security");
const Store = require("../server/admin-store");
const { createHandler } = require("../server/admin-handler");

function environment() {
  return { VERCEL: "1", ADMIN_DATABASE_URL: "postgres://universo_admin_backend:example@localhost/postgres",
    ADMIN_COOKIE_KEY: crypto.randomBytes(32).toString("base64"), ADMIN_MFA_KEY: crypto.randomBytes(32).toString("base64"),
    ADMIN_ALLOWED_ORIGIN: "https://universo.example.com", TURNSTILE_SITE_KEY: "production-site-key",
    TURNSTILE_SECRET_KEY: "example-secret", ADMIN_ALERT_WEBHOOK_URL: "https://alerts.example.com/ingest",
    ADMIN_ALERT_WEBHOOK_KEY: "example-alert-key", CRON_SECRET: "example-cron-key" };
}
function request(action, body = {}, headers = {}) {
  return { method: "POST", url: `/api/admin/${action}`, query: { action }, body,
    headers: { origin: "https://universo.example.com", "content-type": "application/json",
      "x-universo-admin": "1", "x-forwarded-for": "203.0.113.10", ...headers } };
}
function response() {
  const headers = {};
  return { statusCode: 200, headers, setHeader(name, value) { headers[name] = value; }, getHeader(name) { return headers[name]; },
    end(value) { this.body = JSON.parse(value); } };
}

test("signed cookies are separated by purpose and reject tampering", () => {
  const config = S.requireConfig(environment());
  const token = S.randomToken();
  const signed = S.sign(config, token, "session");
  assert.equal(S.unsign(config, signed, "session"), token);
  assert.equal(S.unsign(config, signed, "device"), "");
  assert.equal(S.unsign(config, signed.slice(0, -1) + "!", "session"), "");
});

test("encrypted factors authenticate their ciphertext and reject another key", () => {
  const config = S.requireConfig(environment());
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const ciphertext = S.encryptSecret(secret, config.mfaKey);
  assert.equal(S.decryptSecret(ciphertext, config.mfaKey), secret);
  assert.throws(() => S.decryptSecret(ciphertext, crypto.randomBytes(32)));
  assert.throws(() => S.decryptSecret(ciphertext.slice(0, -1) + "!", config.mfaKey));
});

test("TOTP accepts the current interval and rejects wrong or expired codes", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const now = 59000;
  const code = S.totp(secret).generate({ timestamp: now });
  assert.equal(S.verifyTotp(secret, code, now), 1);
  assert.equal(S.verifyTotp(secret, code, now + 180000), null);
  assert.equal(S.verifyTotp(secret, "not-a-code", now), null);
});

test("CAPTCHA verifies hostname and action with the provider", async () => {
  const config = S.requireConfig(environment());
  const fetcher = (value) => async () => ({ ok: true, json: async () => value });
  assert.equal(await S.verifyCaptcha(config, "token", "203.0.113.10", fetcher({ success: true, hostname: config.hostname, action: "admin-login" })), true);
  assert.equal(await S.verifyCaptcha(config, "token", "203.0.113.10", fetcher({ success: true, hostname: "attacker.example.com", action: "admin-login" })), false);
  assert.equal(await S.verifyCaptcha(config, "token", "203.0.113.10", fetcher({ success: true, hostname: config.hostname, action: "other-action" })), false);
  assert.equal(await S.verifyCaptcha(config, "", "203.0.113.10", fetcher({ success: true })), false);
});

test("CSRF validation rejects missing origin and cross-site requests", () => {
  const config = S.requireConfig(environment());
  assert.deepEqual(S.validateRequest(request("status"), config), {});
  assert.throws(() => S.validateRequest(request("status", {}, { origin: undefined }), config), { status: 403 });
  assert.throws(() => S.validateRequest(request("status", {}, { origin: "https://attacker.example.com" }), config), { status: 403 });
  assert.throws(() => S.validateRequest(request("status", {}, { "sec-fetch-site": "cross-site" }), config), { status: 403 });
  assert.throws(() => S.validateRequest(request("status", { payload: "a".repeat(9000) }), config), { status: 413 });
});

test("IP identification is limited to Vercel's validated forwarding header", () => {
  assert.equal(S.clientIp(request("status"), { VERCEL: "1" }), "203.0.113.10");
  assert.throws(() => S.clientIp(request("status"), {}), { status: 503 });
  assert.throws(() => S.clientIp(request("status", {}, { "x-forwarded-for": "spoofed, 203.0.113.10" }), { VERCEL: "1" }), { status: 400 });
});

test("risk by account triggers CAPTCHA without an account-wide permanent ban", () => {
  const now = new Date();
  const row = { key: "user:hash", limit: Infinity, riskLimit: 10, block: false, failures: 50, requests: 20,
    window_started: now, now, expires_at: new Date(+now + 86400000), blocked_until: null };
  assert.deepEqual(Store.rateDecision([row]), { retryAfter: 0, captchaRequired: true });
  assert.equal(Store.penalty(5, 0), 60);
  assert.equal(Store.penalty(15, 1), 300);
  assert.equal(Store.penalty(50, 100), 900);
});

test("an expired block permits requests again", () => {
  const now = new Date();
  assert.equal(Store.rateDecision([{ limit: 10, block: true, requests: 0, failures: 5, expires_at: new Date(+now + 100000),
    window_started: now, now, blocked_until: new Date(+now - 1000) }]).retryAfter, 0);
});

test("missing production configuration fails closed before accessing the database", async () => {
  let touched = false;
  const handler = createHandler({ env: {}, pool: { query() { touched = true; } } });
  const res = response();
  await handler(request("login", { username: "ADMIN", password: "correct-password", captcha_token: "" }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(touched, false);
});

test("a password success yields only an MFA challenge, never an admin session", async () => {
  const env = environment();
  const handler = createHandler({ env, pool: { query: async (sql) => {
    if (sql.includes("admin_verificar_password")) return { rows: [{ result: { ok: true, usuario: "ADMIN", mfa_ciphertext: "encrypted" } }] };
    return { rows: [], rowCount: 1 };
  } }, store: { reserveAttempt: async () => ({ retryAfter: 0, captchaRequired: false }), audit: async () => {} } });
  const res = response();
  await handler(request("login", { username: "ADMIN", password: "correct-password", captcha_token: "" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mfa_required, true);
  assert.equal(res.body.token, undefined);
  assert.ok(res.headers["Set-Cookie"].some((value) => value.startsWith(`${S.COOKIE.challenge}=`)));
  assert.ok(!res.headers["Set-Cookie"].some((value) => value.startsWith(`${S.COOKIE.session}=`)));
});

test("CAPTCHA and rate limits stop password verification", async () => {
  for (const decision of [{ retryAfter: 60, captchaRequired: true }, { retryAfter: 0, captchaRequired: true }]) {
    let touched = false;
    const handler = createHandler({ env: environment(), pool: { query() { touched = true; } },
      store: { reserveAttempt: async () => decision, audit: async () => {}, deliverAlerts: async () => {} } });
    const res = response();
    await handler(request("login", { username: "ADMIN", password: "correct-password", captcha_token: "" }), res);
    assert.equal(res.statusCode, decision.retryAfter ? 429 : 403);
    assert.equal(touched, false);
  }
});

test("panel and deletion reject access without the HttpOnly session", async () => {
  const handler = createHandler({ env: environment(), pool: { query() { throw new Error("Unexpected database access"); } } });
  for (const action of ["panel", "delete"]) {
    const res = response();
    await handler(request(action), res);
    assert.equal(res.statusCode, 401);
  }
});

test("the public proxy rejects every admin RPC before contacting Supabase", async () => {
  const handler = require("../api/rpc");
  const originalFetch = global.fetch;
  global.fetch = () => { throw new Error("The public proxy must not contact Supabase for admin RPCs"); };
  try {
    for (const name of ["universo_admin_ingresar", "universo_admin_panel", "universo_admin_eliminar_viaje", "universo_admin_salir"]) {
      const res = response();
      await handler({ method: "POST", headers: { "content-type": "application/json" }, body: { name, args: {} } }, res);
      assert.equal(res.statusCode, 403);
    }
  } finally { global.fetch = originalFetch; }
});

module.exports = { environment, request, response };
