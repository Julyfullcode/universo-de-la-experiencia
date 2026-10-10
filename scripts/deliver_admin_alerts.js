"use strict";

const { requireConfig } = require("../server/admin-security");
const { getPool, deliverAlerts, transaction, cleanup } = require("../server/admin-store");

async function main() {
  const config = requireConfig();
  const pool = getPool(config);
  try {
    await deliverAlerts(pool, config);
    await transaction(pool, cleanup);
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Administrative alert worker failed; undelivered events remain queued."); process.exitCode = 1; });
