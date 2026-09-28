"use strict";

// The publishable key is intentionally non-secret. Database access is still
// restricted by revoked table privileges, RLS and the RPC allowlist below.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vbrezgsxbfxtfzfcmqce.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mwJdpfrhPEZCxzHIrJ-7_w_jze0OPzT";

const ALLOWED_RPCS = new Set([
  "universo_ingresar",
  "universo_mi_viaje",
  "universo_guardar_viaje",
  "universo_guardar_feedback",
  "universo_heartbeat",
  "universo_salir",
  "universo_admin_ingresar",
  "universo_admin_panel",
  "universo_admin_salir",
]);

const MAX_BODY_BYTES = 64 * 1024;
const MAX_UPSTREAM_BYTES = 4 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  if (Buffer.isBuffer(request.body)) return JSON.parse(request.body.toString("utf8"));
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body;
}

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function validToken(value) {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

function validRpcArguments(name, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  switch (name) {
    case "universo_ingresar":
      return hasExactKeys(args, ["p_nombre", "p_palabra_clave", "p_modo", "p_legacy_client_id"])
        && (args.p_nombre === null || (typeof args.p_nombre === "string" && args.p_nombre.length <= 80))
        && typeof args.p_palabra_clave === "string"
        && args.p_palabra_clave.length >= 10
        && args.p_palabra_clave.length <= 64
        && Buffer.byteLength(args.p_palabra_clave, "utf8") <= 72
        && ["register", "recover"].includes(args.p_modo)
        && (args.p_legacy_client_id === null
          || (typeof args.p_legacy_client_id === "string" && UUID_PATTERN.test(args.p_legacy_client_id)));
    case "universo_mi_viaje":
    case "universo_heartbeat":
    case "universo_salir":
    case "universo_admin_panel":
    case "universo_admin_salir":
      return hasExactKeys(args, ["p_token"]) && validToken(args.p_token);
    case "universo_guardar_viaje":
      return hasExactKeys(args, ["p_token", "p_viaje"])
        && validToken(args.p_token)
        && args.p_viaje && typeof args.p_viaje === "object" && !Array.isArray(args.p_viaje)
        && Buffer.byteLength(JSON.stringify(args.p_viaje), "utf8") <= 32 * 1024;
    case "universo_guardar_feedback":
      return hasExactKeys(args, ["p_token", "p_calificacion", "p_recomendacion"])
        && validToken(args.p_token)
        && Number.isInteger(args.p_calificacion)
        && args.p_calificacion >= 1 && args.p_calificacion <= 5
        && typeof args.p_recomendacion === "string" && args.p_recomendacion.length <= 2000;
    case "universo_admin_ingresar":
      return hasExactKeys(args, ["p_usuario", "p_clave"])
        && typeof args.p_usuario === "string" && args.p_usuario.length >= 1 && args.p_usuario.length <= 64
        && typeof args.p_clave === "string" && args.p_clave.length >= 8 && args.p_clave.length <= 200;
    default:
      return false;
  }
}

function requestIsSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const forwardedHost = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0].trim();
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  if (!forwardedHost || !["http", "https"].includes(forwardedProto)) return false;
  try {
    return new URL(origin).origin === `${forwardedProto}://${forwardedHost}`;
  } catch {
    return false;
  }
}

function safeUpstreamError(payload, status) {
  const code = typeof payload?.code === "string" ? payload.code : "";
  if (code === "28000") return { status: 401, message: "Sesión inválida o vencida." };
  if (code === "22023") return { status: 400, message: String(payload?.message || "Solicitud no válida.").slice(0, 240) };
  if (status === 429) return { status: 429, message: "Demasiadas solicitudes. Intenta nuevamente más tarde." };
  return { status: 502, message: "El servicio de datos no pudo completar la solicitud." };
}

module.exports = async function handler(request, response) {
  response.setHeader("X-Universe-Rpc-Proxy", "1");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message: "Método no permitido." });
  }
  if (!requestIsSameOrigin(request)) {
    return sendJson(response, 403, { message: "Origen no permitido." });
  }
  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return sendJson(response, 415, { message: "Se requiere contenido JSON." });
  }

  const declaredLength = Number(request.headers["content-length"] || 0);
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) {
    return sendJson(response, 413, { message: "La solicitud es demasiado grande." });
  }

  let body;
  try {
    body = parseBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new TypeError();
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      return sendJson(response, 413, { message: "La solicitud es demasiado grande." });
    }
  } catch {
    return sendJson(response, 400, { message: "El cuerpo JSON no es válido." });
  }

  if (!hasExactKeys(body, ["name", "args"])) {
    return sendJson(response, 400, { message: "La solicitud contiene campos no permitidos." });
  }
  const { name, args } = body;
  if (typeof name !== "string" || !ALLOWED_RPCS.has(name)) {
    return sendJson(response, 403, { message: "RPC no permitida." });
  }
  if (!validRpcArguments(name, args)) {
    return sendJson(response, 400, { message: "Los argumentos de la solicitud no son válidos." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });

    const responseBody = await upstream.text();
    if (Buffer.byteLength(responseBody, "utf8") > MAX_UPSTREAM_BYTES) {
      return sendJson(response, 502, { message: "La respuesta del servicio excede el tamaño permitido." });
    }
    let payload = null;
    try {
      payload = responseBody ? JSON.parse(responseBody) : null;
    } catch {
      return sendJson(response, 502, { message: "El servicio de datos devolvió una respuesta no válida." });
    }
    if (!upstream.ok) {
      const safe = safeUpstreamError(payload, upstream.status);
      return sendJson(response, safe.status, { message: safe.message, code: payload?.code || undefined });
    }
    return sendJson(response, 200, payload);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return sendJson(response, timedOut ? 504 : 502, {
      message: timedOut
        ? "El servicio de datos tardó demasiado en responder."
        : "No fue posible conectar con el servicio de datos.",
    });
  } finally {
    clearTimeout(timeout);
  }
};
