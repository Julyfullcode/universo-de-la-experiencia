"use strict";

// Owner access is the recovery boundary. It is never exposed as an HTTP route.
const crypto = require("node:crypto");
const readline = require("node:readline/promises");
const { Client } = require("pg");
const OTPAuth = require("otpauth");
const S = require("../server/admin-security");

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Use an interactive terminal.");
  const config = S.requireConfig();
  if (!process.env.ADMIN_BOOTSTRAP_DATABASE_URL) throw new Error("Owner connection required.");
  const ownerUrl = new URL(process.env.ADMIN_BOOTSTRAP_DATABASE_URL);
  ["sslmode", "sslcert", "sslkey", "sslrootcert"].forEach((key) => ownerUrl.searchParams.delete(key));
  const client = new Client({ connectionString: ownerUrl.toString(), ssl: { rejectUnauthorized: true,
    ...(config.ADMIN_DATABASE_CA ? { ca: config.ADMIN_DATABASE_CA } : {}) }, connectionTimeoutMillis: 10000 });
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await client.connect();
    const { rows: [account] } = await client.query("select usuario from public.universo_admin_config where singleton");
    if (!account) throw new Error("Account not found.");
    const confirmation = await prompt.question("Este cambio revocará todas las sesiones. Escribe RESTABLECER MFA para continuar: ");
    if (confirmation !== "RESTABLECER MFA") return;
    const secret = new OTPAuth.Secret({ size: 20 });
    console.log(`Agrega la cuenta ${account.usuario} a tu autenticador.\nClave: ${secret.base32}\nTOTP, SHA1, 6 dígitos, 30 segundos.`);
    const code = (await prompt.question("Código de seis dígitos para confirmar el nuevo factor: ")).trim();
    if (S.verifyTotp(secret.base32, code) === null) throw new Error("Invalid enrollment verification.");
    await client.query("begin");
    try {
      await client.query("update public.universo_admin_config set mfa_ciphertext=$1, mfa_last_counter=-1, updated_at=clock_timestamp() where singleton", [S.encryptSecret(secret.base32, config.mfaKey)]);
      await client.query("update public.universo_admin_sessions set revoked_at=clock_timestamp() where revoked_at is null");
      await client.query("update universo_private.admin_challenges set consumed_at=clock_timestamp() where consumed_at is null");
      const { rows: [event] } = await client.query(`insert into universo_private.admin_events (event,user_hash,request_id)
        values ('mfa_owner_recovery',$1,$2) returning id`, [S.pseudonym(config, `user:${account.usuario.toUpperCase()}`), crypto.randomUUID()]);
      await client.query("insert into universo_private.admin_alerts(event_id) values($1)", [event.id]);
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    console.log("Factor actualizado, sesiones revocadas y alerta registrada. Conserva las claves originales del servidor.");
  } finally { prompt.close(); await client.end(); }
}
main().catch(() => { console.error("MFA recovery failed. No database credentials or secrets are printed."); process.exitCode = 1; });
