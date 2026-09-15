const SUPABASE_URL = "https://vbrezgsxbfxtfzfcmqce.supabase.co";
const SUPABASE_KEY = "sb_publishable_mwJdpfrhPEZCxzHIrJ-7_w_jze0OPzT";

const ALLOWED_RPCS = new Set([
  "universo_ingresar",
  "universo_mi_viaje",
  "universo_guardar_viaje",
  "universo_guardar_feedback",
  "universo_heartbeat",
  "universo_salir",
]);

const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString("utf8"));
  }
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }
  return request.body;
}

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Universe-Rpc-Proxy", "1");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message: "Método no permitido." });
  }

  const declaredLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return sendJson(response, 413, { message: "La solicitud es demasiado grande." });
  }

  let body;
  try {
    body = parseBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new TypeError("El cuerpo debe ser un objeto JSON.");
    }
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      return sendJson(response, 413, { message: "La solicitud es demasiado grande." });
    }
  } catch {
    return sendJson(response, 400, { message: "El cuerpo JSON no es válido." });
  }

  const { name, args } = body;
  if (typeof name !== "string" || !ALLOWED_RPCS.has(name)) {
    return sendJson(response, 403, { message: "RPC no permitida." });
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return sendJson(response, 400, { message: "El campo args debe ser un objeto JSON." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: controller.signal,
      },
    );

    const responseBody = await upstream.text();
    response.statusCode = upstream.status;
    response.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json; charset=utf-8",
    );

    if (!responseBody) {
      return response.end();
    }

    try {
      JSON.parse(responseBody);
    } catch {
      return sendJson(response, 502, { message: "Supabase devolvió una respuesta no válida." });
    }

    return response.end(responseBody);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return sendJson(response, timedOut ? 504 : 502, {
      message: timedOut
        ? "Supabase tardó demasiado en responder."
        : "No fue posible conectar con Supabase.",
    });
  } finally {
    clearTimeout(timeout);
  }
};
