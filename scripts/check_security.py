"""Static security and repository-hygiene regression checks.

These controls verify properties visible in source. They complement, but do not
replace, a penetration test and verification of the deployed Supabase/Vercel
configuration.
"""

from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]
CHECKS = 0


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8", errors="strict")


def require(condition, message):
    global CHECKS
    if not condition:
        raise AssertionError(message)
    CHECKS += 1


def main():
    app = read("app.js")
    index = read("index.html")
    schema = read("supabase/schema.sql")
    migration = read("supabase/migrations/20260928103000_endurecimiento_seguridad.sql")
    admin_migration = read("supabase/migrations/20261005130000_admin_passports_and_delete.sql")
    admin = read("admin.js") + read("admin.html")
    proxy = read("api/rpc.js")
    styles = read("styles.css") + read("admin.css") + read("universe-map.css")
    vercel = json.loads(read("vercel.json"))

    require('id="access-key" type="password"' in app,
            "The participant secret must use a password input.")
    require('minlength="10" maxlength="64"' in app,
            "The browser must enforce the documented key length.")
    require("Guarda tu palabra clave en un lugar seguro" in app,
            "The recovery warning must remain visible.")
    require("p_palabra_clave:accessKey" in app and "p_modo:mode" in app,
            "The participant login contract is incomplete.")
    require("showName=!recovering||recoveryNeedsName" in app and
            "mode===\"recover\"&&result.requires_name" in app,
            "Ambiguous legacy recovery must request a name.")
    require("p_correo" not in app and 'id="email"' not in app,
            "Email-based participant access must not return.")
    require(not re.search(r"(?:local|session)Storage\.setItem\([^\n;]*accessKey", app),
            "The plaintext access key must never be stored in the browser.")
    require("sessionStorage.setItem(SESSION_KEY" in app and
            "localStorage.removeItem(SESSION_KEY)" in app,
            "Participant tokens must be session-scoped and legacy persistent tokens removed.")
    require("sessionStorage.setItem(PENDING_KEY" in app and
            "localStorage.setItem(PENDING_KEY" not in app,
            "Pending participant data must be session-scoped.")
    require(not re.search(r"on(?:click|submit|change|input|load|error)\s*=", app + index, re.I),
            "Executable HTML attributes are forbidden by CSP.")
    require("data-action" in app and 'app.addEventListener("click"' in app,
            "Dynamic controls must use delegated event listeners.")
    require("SUPABASE_KEY" not in app + admin and "supabase.co" not in app + admin + index,
            "Browsers must not connect directly to Supabase.")
    require("https://" not in index and "http://" not in index and "fonts.googleapis.com" not in styles,
            "Runtime browser dependencies must be same-origin.")

    require("universo_private.configuracion" in schema and "access_pepper" in schema,
            "Credential lookup requires a private server-side pepper.")
    require("extensions.hmac(" in schema and "'sha256'" in schema,
            "Credential lookup must use HMAC-SHA-256.")
    require("extensions.crypt(p_palabra_clave" in schema and
            "extensions.gen_salt('bf', 12)" in schema,
            "Participant keys must use bcrypt cost 12.")
    require("universo_participant_login_attempts" in schema and
            "v_failures >= 5" in schema and "interval '15 minutes'" in schema,
            "Participant recovery must be rate-limited.")
    require("v_global_failures >= 100" in schema and
            "acceso administrativo está temporalmente limitado" in schema,
            "Administrative login requires a global abuse limit.")
    require("perform extensions.crypt('verificacion-constante', v_verify_hash)" in schema and
            "perform extensions.crypt(p_clave, v_verify_hash)" in schema,
            "Unknown administrative users require constant-work password verification.")
    require("last_seen_at > pg_catalog.clock_timestamp() - interval '30 minutes'" in schema,
            "Administrative idle timeout must be enforced by the database.")
    require("update public.universo_admin_sessions" in schema and
            "where revoked_at is null" in schema,
            "A new administrative login must revoke older active sessions.")
    require("enable row level security" in schema and
            "revoke all privileges on table public.universo_viajes" in schema,
            "Application tables must be protected from direct roles.")
    require("set search_path = ''" in schema and
            "security definer" in schema,
            "Privileged database functions require an empty search path.")
    require("grant execute on function public.universo_ingresar(text, text, text, uuid) to anon" in schema,
            "Only the current participant RPC signature should be exposed.")
    require("grant execute on function public.universo_ingresar(text, text, uuid)" not in schema,
            "The obsolete participant RPC signature must stay revoked.")
    require("'correo', v.correo" not in schema and "participant.correo" not in admin,
            "Legacy participant email must not be returned or displayed.")
    require("on conflict (singleton) do nothing" in schema,
            "Schema reapplication must preserve the production admin credential.")
    require(not re.search(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}", schema + migration),
            "Concrete bcrypt credential hashes must not be committed.")
    require("validar_admin_token" in migration and "v_global_failures >= 100" in migration,
            "The production hardening migration must include the admin controls.")

    for rpc_name in (
        "universo_ingresar", "universo_mi_viaje", "universo_guardar_viaje",
        "universo_guardar_feedback", "universo_heartbeat", "universo_salir",
        "universo_admin_ingresar", "universo_admin_panel", "universo_admin_eliminar_viaje", "universo_admin_salir",
    ):
        require(f'"{rpc_name}"' in proxy, f"Proxy allowlist is missing {rpc_name}.")
    require("validRpcArguments" in proxy and "hasExactKeys" in proxy,
            "The proxy must validate RPC-specific argument schemas.")
    require("requestIsSameOrigin" in proxy and "Origen no permitido" in proxy,
            "The proxy must reject cross-origin browser requests.")
    require("content-type" in proxy and "application/json" in proxy and "MAX_BODY_BYTES" in proxy,
            "The proxy must enforce JSON and request-size limits.")
    require("safeUpstreamError" in proxy and "payload?.details" not in proxy,
            "The proxy must not relay database details or hints.")
    require("service_role" not in proxy.lower(),
            "The serverless proxy must never contain a service-role credential.")
    require('fetch("/api/rpc"' in admin and "SUPABASE_KEY" not in admin,
            "Administration must use the same-origin proxy.")
    require("p_viaje_id" in proxy and "UUID_PATTERN.test(args.p_viaje_id)" in proxy,
            "Administrative deletion must validate the trip UUID at the proxy boundary.")
    require("universo_admin_eliminar_viaje" in admin_migration and
            "universo_private.validar_admin_token(p_token)" in admin_migration and
            "where id = p_viaje_id and palabra_clave_hash is not null" in admin_migration,
            "Administrative deletion must require an admin session and target one registered trip.")

    global_headers = next(
        (entry["headers"] for entry in vercel.get("headers", []) if entry.get("source") == "/(.*)"),
        [],
    )
    header_values = {item["key"].lower(): item["value"] for item in global_headers}
    csp = header_values.get("content-security-policy", "")
    require(header_values.get("x-content-type-options") == "nosniff",
            "Production must disable MIME sniffing.")
    require(header_values.get("x-frame-options") == "DENY" and "frame-ancestors 'none'" in csp,
            "Production pages must not be frameable.")
    require(header_values.get("referrer-policy") == "no-referrer",
            "Production must not leak referrer information.")
    require("camera=()" in header_values.get("permissions-policy", "") and
            "microphone=()" in header_values.get("permissions-policy", ""),
            "Unused sensitive browser capabilities must be disabled.")
    require("default-src 'self'" in csp and "object-src 'none'" in csp and
            "base-uri 'self'" in csp and "frame-src 'none'" in csp,
            "CSP must restrict default, object, base and frame sources.")
    require("script-src 'self'" in csp and "script-src-attr 'none'" in csp and
            "cdn.jsdelivr.net" not in csp,
            "CSP must allow only same-origin scripts and block executable attributes.")
    require("connect-src 'self'" in csp and "supabase.co" not in csp,
            "Browsers must only connect to the same origin.")
    require(header_values.get("strict-transport-security", "").startswith("max-age=63072000"),
            "HSTS must be enabled for production.")
    require(header_values.get("cross-origin-embedder-policy") == "require-corp" and
            header_values.get("cross-origin-opener-policy") == "same-origin",
            "Production must enable cross-origin isolation.")

    jspdf_head = (ROOT / "vendor/jspdf.umd.min.js").read_text(encoding="utf-8", errors="replace")[:600]
    require("Version 4.2.1" in jspdf_head,
            "jsPDF must be the security-patched 4.2.1 release.")
    require((ROOT / "vendor/JSPDF-LICENSE.txt").is_file() and
            (ROOT / "vendor/HTML2CANVAS-LICENSE.txt").is_file() and
            (ROOT / "vendor/THREE-LICENSE.txt").is_file(),
            "Every vendored browser dependency requires its license.")

    expected_assets = {
        "favicon.svg", "galaxia-andromeda-fotorealista.png", "logo-grupo-epm.png",
        "pasaporte-cosmico.png", "universo-galaxia-realista.png",
        "company-logos/afinia-group.jpeg", "company-logos/aguas-antofagasta.svg",
        "company-logos/aguas-de-malambo.png", "company-logos/aguas-del-oriente.png",
        "company-logos/aguas-regionales.svg", "company-logos/cens-group.jpeg",
        "company-logos/chec-group.jpeg", "company-logos/comegsa-directory.png",
        "company-logos/delsur-directory.jpeg", "company-logos/edeq-group.jpeg",
        "company-logos/eegsa-directory.png", "company-logos/emvarias-group.jpeg",
        "company-logos/energica-primary.png", "company-logos/ensa-directory.jpeg",
        "company-logos/epm.svg", "company-logos/essa-group.png", "company-logos/somos.svg",
        "textures/README.md", "textures/earth-clouds.jpg", "textures/earth-day.jpg",
        "textures/jupiter.jpg", "textures/mars.jpg", "textures/neptune.jpg",
        "textures/saturn.jpg", "textures/uranus.jpg",
    }
    actual_assets = {
        item.relative_to(ROOT / "assets").as_posix()
        for item in (ROOT / "assets").rglob("*") if item.is_file()
    }
    require(actual_assets == expected_assets,
            f"Assets inventory differs from the audited runtime set: {sorted(actual_assets ^ expected_assets)}")
    require(not (ROOT / ".tools").exists() and not (ROOT / "app").exists() and not (ROOT / "lib").exists(),
            "Local deployment artifacts and empty legacy directories must be absent.")
    vercel_ignore = read(".vercelignore")
    require("supabase" in vercel_ignore and "scripts" in vercel_ignore and ".env*" in vercel_ignore,
            "Development, migration and environment files must be excluded from deployment.")

    print(f"Security checks passed: {CHECKS} controls verified.")


if __name__ == "__main__":
    main()
