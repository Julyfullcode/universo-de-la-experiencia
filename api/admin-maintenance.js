"use strict";

const crypto = require("node:crypto");
const { requireConfig } = require("../server/admin-security");
const { getPool, transaction, deliverAlerts, cleanup } = require("../server/admin-store");

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const config = requireConfig();
    const actual = Buffer.from(String(request.headers.authorization || ""));
    const expected = Buffer.from(`Bearer ${config.CRON_SECRET}`);
    if (request.method !== "GET" || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      response.statusCode = 403;
      return response.end('{"ok":false}');
    }
    const pool = getPool(config);
    await deliverAlerts(pool, config, fetch, 5);
    await transaction(pool, cleanup);
    return response.end('{"ok":true}');
  } catch {
    console.error(JSON.stringify({ event: "admin_maintenance_failed" }));
    response.statusCode = 503;
    return response.end('{"ok":false}');
  }
};
