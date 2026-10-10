"use strict";

const crypto = require("node:crypto");
const net = require("node:net");
const OTPAuth = require("otpauth");

const COOKIE = {
  device: "__Host-universo-device",
  session: "__Host-universo-admin",
  challenge: "__Host-universo-challenge",
};

class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    Object.assign(this, { status, code, extra });
  }
}

function requireConfig(env = process.env) {
  const captchaProvider = env.ADMIN_CAPTCHA_PROVIDER || "turnstile";
  if (!["turnstile", "botid"].includes(captchaProvider)) throw new Error("Invalid CAPTCHA provider");
  const alertProvider = env.ADMIN_ALERT_PROVIDER || "webhook";
  if (!["webhook", "resend"].includes(alertProvider)) throw new Error("Invalid alert provider");
  const required = ["ADMIN_DATABASE_URL", "ADMIN_COOKIE_KEY", "ADMIN_MFA_KEY", "ADMIN_ALLOWED_ORIGIN", "CRON_SECRET",
    ...(captchaProvider === "turnstile" ? ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"] : []),
    ...(alertProvider === "webhook" ? ["ADMIN_ALERT_WEBHOOK_URL", "ADMIN_ALERT_WEBHOOK_KEY"] : ["RESEND_API_KEY", "ADMIN_ALERT_FROM", "ADMIN_ALERT_RECIPIENTS"])];
  if (required.some((key) => !env[key])) throw new HttpError(503, "ADMIN_UNAVAILABLE", "El acceso administrativo aún no está configurado.");
  const cookieKey = Buffer.from(env.ADMIN_COOKIE_KEY, "base64");
  const mfaKey = Buffer.from(env.ADMIN_MFA_KEY, "base64");
  if (cookieKey.length !== 32 || mfaKey.length !== 32 || cookieKey.equals(mfaKey)) throw new Error("Invalid administrative keys");
  const origin = new URL(env.ADMIN_ALLOWED_ORIGIN);
  if (origin.protocol !== "https:" || origin.origin !== env.ADMIN_ALLOWED_ORIGIN
      || (alertProvider === "webhook" && new URL(env.ADMIN_ALERT_WEBHOOK_URL).protocol !== "https:")) throw new Error("HTTPS required");
  if (captchaProvider === "turnstile" && /^(?:1|2|3)x000/.test(env.TURNSTILE_SITE_KEY)) throw new Error("Production CAPTCHA keys required");
  const recipients = alertProvider === "resend" ? env.ADMIN_ALERT_RECIPIENTS.split(",").map(value => value.trim()) : [];
  if (alertProvider === "resend" && (recipients.length < 1 || recipients.length > 5
      || [...recipients, env.ADMIN_ALERT_FROM].some(value => !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)))) throw new Error("Invalid alert addresses");
  return { ...env, cookieKey, mfaKey, captchaProvider, alertProvider, recipients, origin: origin.origin, hostname: origin.hostname };
}

function digest(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function pseudonym(config, value) { return crypto.createHmac("sha256", config.cookieKey).update(value).digest("hex"); }
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString("hex"); }
function sign(config, value, purpose) {
  return `${value}.${crypto.createHmac("sha256", config.cookieKey).update(`${purpose}:${value}`).digest("base64url")}`;
}
function unsign(config, value, purpose) {
  if (typeof value !== "string" || value.length > 256) return "";
  const [raw, signature, extra] = value.split(".");
  if (extra || !/^[a-f0-9]{64}$/.test(raw || "") || !signature) return "";
  const expected = sign(config, raw, purpose).split(".")[1];
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? raw : "";
}
function cookies(request) {
  const result = {};
  for (const item of String(request.headers.cookie || "").split(";")) {
    const at = item.indexOf("=");
    if (at > 0) result[item.slice(0, at).trim()] = item.slice(at + 1).trim();
  }
  return result;
}
function setCookie(response, name, value, seconds) {
  const current = response.getHeader("Set-Cookie") || [];
  response.setHeader("Set-Cookie", [...(Array.isArray(current) ? current : [current]),
    `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`]);
}
function validateRequest(request, config) {
  if (request.method !== "POST") throw new HttpError(405, "METHOD", "Método no permitido.");
  // Reject missing Origin too: all supported clients are same-origin browsers.
  if (request.headers.origin !== config.origin || request.headers["x-universo-admin"] !== "1"
      || (request.headers["sec-fetch-site"] && request.headers["sec-fetch-site"] !== "same-origin")) {
    throw new HttpError(403, "ORIGIN", "Origen no permitido.");
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] || "")) {
    throw new HttpError(415, "CONTENT_TYPE", "Se requiere contenido JSON.");
  }
  const length = Number(request.headers["content-length"] || 0);
  if (!Number.isFinite(length) || length < 0 || length > 8192) throw new HttpError(413, "BODY_SIZE", "Solicitud demasiado grande.");
  let body;
  try {
    const source = request.body;
    if (typeof source === "string" && Buffer.byteLength(source) > 8192) throw new HttpError(413, "BODY_SIZE", "Solicitud demasiado grande.");
    if (Buffer.isBuffer(source) && source.length > 8192) throw new HttpError(413, "BODY_SIZE", "Solicitud demasiado grande.");
    body = Buffer.isBuffer(source) ? JSON.parse(source.toString("utf8")) : typeof source === "string" ? JSON.parse(source) : source;
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error();
    if (Buffer.byteLength(JSON.stringify(body)) > 8192) throw new HttpError(413, "BODY_SIZE", "Solicitud demasiado grande.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "BODY", "Solicitud no válida.");
  }
  return body;
}
function exactKeys(body, expected) {
  const keys = Object.keys(body).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}
function clientIp(request, env = process.env) {
  // This header is overwritten by Vercel. Never accept it on another deployment.
  if (env.VERCEL !== "1") throw new HttpError(503, "PLATFORM", "Plataforma administrativa no configurada.");
  const value = String(request.headers["x-forwarded-for"] || "").trim();
  if (!net.isIP(value)) throw new HttpError(400, "IP", "Origen de conexión no válido.");
  return value.toLowerCase();
}
function encryptSecret(secret, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("universo-admin-totp:v1"));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
function decryptSecret(value, key) {
  const [version, iv, tag, ciphertext, extra] = String(value).split(".");
  if (version !== "v1" || extra || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted factor");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from("universo-admin-totp:v1"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
function totp(secret) {
  return new OTPAuth.TOTP({ issuer: "Universo de la Experiencia", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
}
function verifyTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = totp(secret).validate({ token: code, window: 1, timestamp: now });
  return delta === null ? null : Math.floor(now / 30000) + delta;
}
async function verifyCaptcha(config, token, ip, fetcher = fetch) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: config.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new HttpError(503, "CAPTCHA_UNAVAILABLE", "La verificación está temporalmente indisponible.");
  const value = await response.json();
  return value.success === true && value.hostname === config.hostname && value.action === "admin-login";
}

async function verifyBotId(checker = require("botid/server").checkBotId, observe = () => {}) {
  // Force the real check even on Preview; the SDK's development bypass is forbidden.
  const result = await checker({ developmentOptions: { isDevelopment: false }, advancedOptions: { checkLevel: "basic" } });
  observe(Object.fromEntries(["isHuman", "isBot", "isVerifiedBot", "bypassed"].map(key => [key, typeof result?.[key] === "boolean" ? result[key] : "missing"])));
  return result.isHuman === true && result.isBot === false && result.isVerifiedBot === false && result.bypassed === false;
}

module.exports = { COOKIE, HttpError, requireConfig, digest, pseudonym, randomToken, sign, unsign,
  cookies, setCookie, validateRequest, exactKeys, clientIp, encryptSecret, decryptSecret, totp, verifyTotp, verifyCaptcha, verifyBotId };
