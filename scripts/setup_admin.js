"use strict";

// Interactive owner-only provisioning. This script never runs on the web server.
// Secrets go to a gitignored file and the factor is confirmed before SQL cutover.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const readline = require("node:readline/promises");
const { Client } = require("pg");
const OTPAuth = require("otpauth");
const { encryptSecret, verifyTotp, requireConfig } = require("../server/admin-security");

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run provisioning in an interactive terminal.");
  if (!process.env.ADMIN_BOOTSTRAP_DATABASE_URL) throw new Error("Set ADMIN_BOOTSTRAP_DATABASE_URL to an owner connection before provisioning.");
  const output = path.resolve(__dirname, "../.env.admin.local");
  if (fs.existsSync(output)) throw new Error("An administrative configuration already exists. Preserve its keys before any factor reset.");
  const mfaKey = crypto.randomBytes(32);
  const cookieKey = crypto.randomBytes(32);
  const dbPassword = crypto.randomBytes(32).toString("base64url");
  const alertKey = crypto.randomBytes(32).toString("base64url");
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  let client;
  try {
    const origin = (process.env.ADMIN_ALLOWED_ORIGIN || await prompt.question("Dominio HTTPS del proyecto (por ejemplo https://universo.example.com): ")).trim();
    const siteKey = process.env.TURNSTILE_SITE_KEY || await prompt.question("Clave pública del widget Turnstile: ");
    // Secret values must be set as environment variables; never echo them.
    if (!process.env.TURNSTILE_SECRET_KEY || !process.env.ADMIN_ALERT_WEBHOOK_URL) {
      throw new Error("Set TURNSTILE_SECRET_KEY and ADMIN_ALERT_WEBHOOK_URL privately before running this assistant.");
    }
    const ownerUrl = new URL(process.env.ADMIN_BOOTSTRAP_DATABASE_URL);
    ["sslmode", "sslcert", "sslkey", "sslrootcert"].forEach((key) => ownerUrl.searchParams.delete(key));
    client = new Client({ connectionString: ownerUrl.toString(), ssl: { rejectUnauthorized: true,
      ...(process.env.ADMIN_DATABASE_CA ? { ca: process.env.ADMIN_DATABASE_CA } : {}) }, connectionTimeoutMillis: 10000 });
    await client.connect();
    const { rows: [account] } = await client.query("select usuario, to_jsonb(c)->>'mfa_ciphertext' as mfa_ciphertext from public.universo_admin_config c where singleton");
    if (!account) throw new Error("Apply the existing schema and migrations before provisioning.");
    if (account.mfa_ciphertext) throw new Error("A factor is already enrolled. Use an audited owner recovery procedure instead of replacing it.");
    const secret = new OTPAuth.Secret({ size: 20 });
    console.log("\nAgrega esta cuenta manualmente a tu aplicación autenticadora:");
    console.log(`Cuenta: ${account.usuario}\nClave: ${secret.base32}\nTipo: TOTP, 6 dígitos, 30 segundos, SHA1`);
    const code = (await prompt.question("Código actual de seis dígitos para confirmar el alta: ")).trim();
    if (verifyTotp(secret.base32, code) === null) throw new Error("Invalid verification code. Database permissions were not changed.");
    const runtimeUrl = new URL(ownerUrl);
    // Supavisor pooler users need the project suffix; direct Postgres users do not.
    const suffix = ownerUrl.hostname.endsWith("pooler.supabase.com") ? ownerUrl.username.split(".").slice(1).join(".") : "";
    runtimeUrl.username = `universo_admin_backend${suffix ? `.${suffix}` : ""}`;
    runtimeUrl.password = dbPassword;
    const env = {
      ADMIN_DATABASE_URL: runtimeUrl.toString(), ADMIN_COOKIE_KEY: cookieKey.toString("base64"),
      ADMIN_MFA_KEY: mfaKey.toString("base64"), ADMIN_ALLOWED_ORIGIN: origin,
      TURNSTILE_SITE_KEY: siteKey.trim(), TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
      ADMIN_ALERT_WEBHOOK_URL: process.env.ADMIN_ALERT_WEBHOOK_URL,
      ADMIN_ALERT_WEBHOOK_KEY: process.env.ADMIN_ALERT_WEBHOOK_KEY || alertKey,
      CRON_SECRET: crypto.randomBytes(32).toString("base64url"),
      ...(process.env.ADMIN_DATABASE_CA ? { ADMIN_DATABASE_CA: process.env.ADMIN_DATABASE_CA } : {}),
    };
    requireConfig(env);
    // Store generated credentials before any irreversible database change.
    fs.writeFileSync(output, Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n", { mode: 0o600, flag: "wx" });
    await client.query("begin");
    try {
      const migration = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/20261009120000_admin_segregado.sql"), "utf8")
        .replace(/^begin;$/m, "").replace(/^commit;$/m, "");
      await client.query(migration);
      // Password contains only base64url characters; role name is a fixed identifier.
      await client.query(`alter role universo_admin_backend login password '${dbPassword}'`);
      await client.query("update public.universo_admin_config set mfa_ciphertext = $1, mfa_last_counter = -1 where singleton", [encryptSecret(secret.base32, mfaKey)]);
      if (process.env.ADMIN_INITIAL_PASSWORD) {
        if (process.env.ADMIN_INITIAL_PASSWORD.length < 16 || Buffer.byteLength(process.env.ADMIN_INITIAL_PASSWORD, "utf8") > 72) {
          throw new Error("Initial password must contain at least 16 characters and at most 72 UTF-8 bytes.");
        }
        await client.query("update public.universo_admin_config set password_hash=extensions.crypt($1,extensions.gen_salt('bf',12)) where singleton", [process.env.ADMIN_INITIAL_PASSWORD]);
      }
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    console.log("\nFactor confirmado y migración aplicada. Configuración privada guardada en .env.admin.local.");
    console.log("Carga esas variables en Vercel antes de desplegar. No compartas ni subas este archivo a Git.");
    console.log("Configura el receptor de alertas con ADMIN_ALERT_WEBHOOK_KEY y comprueba una alerta de prueba.");
  } finally { prompt.close(); if (client) await client.end(); }
}

main().catch(() => { console.error("No se completó la configuración administrativa. Revisa los requisitos y la conexión privada; no se imprimen detalles para proteger credenciales."); process.exitCode = 1; });
