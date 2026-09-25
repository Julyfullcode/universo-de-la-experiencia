"""Static security regression checks for participant access.

These checks do not replace deployment verification or a penetration test. They
guard the security properties that can be established from this repository.
"""

from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    app = read("app.js")
    schema = read("supabase/schema.sql")
    admin = read("admin.js") + read("admin.html")
    proxy = read("api/rpc.js")
    vercel = json.loads(read("vercel.json"))

    require('id="access-key" type="password"' in app,
            "The participant secret must use a password input.")
    require('minlength="10" maxlength="64"' in app,
            "The browser must enforce the documented key length.")
    require("Guarda tu palabra clave en un lugar seguro" in app,
            "The recovery warning must remain visible on the access screen.")
    require("p_palabra_clave:accessKey" in app and "p_modo:mode" in app,
            "The access RPC contract is incomplete.")
    require("showName=!recovering||recoveryNeedsName" in app and
            "mode===\"recover\"&&result.requires_name" in app,
            "Recovery must request a name only when a legacy key is ambiguous.")
    require("p_nombre:name||null" in app and "recoveryKeyDraft" in app,
            "The ambiguity retry must send the name without persisting the key.")
    require("p_correo" not in app and 'id="email"' not in app,
            "Email-based participant access must not return to the UI.")
    require(not re.search(r"localStorage\.setItem\([^\n;]*accessKey", app),
            "The plaintext access key must never be written to localStorage.")

    require("universo_private.configuracion" in schema and "access_pepper" in schema,
            "A private server-side pepper is required for credential lookup.")
    require("extensions.hmac(" in schema and "'sha256'" in schema,
            "Credential lookup must use HMAC-SHA-256.")
    require("extensions.crypt(p_palabra_clave" in schema and
            "extensions.gen_salt('bf', 12)" in schema,
            "Participant keys must be verified and stored with bcrypt cost 12.")
    require("universo_participant_login_attempts" in schema and
            "v_failures >= 5" in schema and "interval '15 minutes'" in schema,
            "Recovery attempts must be rate-limited.")
    require("Palabra clave incorrecta." in schema,
            "Recovery failures must use a generic response.")
    require("identificador_acceso_version smallint not null default 1" in schema and
            "identificador_acceso_version = 2" in schema and "'keyword-v2:'" in schema,
            "Keyword-only recovery must use a versioned private HMAC lookup.")
    require("v_match_is_legacy" in schema and "v_match_count > 1" in schema and
            "'requires_name', true" in schema and "v_name_match_count" in schema,
            "Ambiguous legacy credentials must require a name before returning a session.")
    require("enable row level security" in schema and
            "revoke all privileges on table public.universo_participant_login_attempts" in schema,
            "Credential and attempt tables must not be directly accessible.")
    require("grant execute on function public.universo_ingresar(text, text, text, uuid) to anon" in schema,
            "Only the current access RPC signature should be exposed.")
    require("grant execute on function public.universo_ingresar(text, text, uuid)" not in schema,
            "The obsolete email-based RPC signature must not be granted.")
    require("'correo', v.correo" not in schema,
            "The participant/admin RPC payload must not expose legacy email values.")
    require("on conflict (singleton) do nothing" in schema,
            "An idempotent migration must preserve the production admin credential.")
    require(not re.search(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}", schema),
            "No concrete bcrypt credential hash may be committed to the schema.")

    require("participant.correo" not in admin and "item.correo" not in admin,
            "The admin UI must not display legacy participant email values.")
    require('"universo_ingresar"' in proxy and '"universo_admin_ingresar"' not in proxy,
            "The public proxy allowlist must not expose administrative RPCs.")

    global_headers = next(
        (entry["headers"] for entry in vercel.get("headers", []) if entry.get("source") == "/(.*)"),
        [],
    )
    header_values = {item["key"].lower(): item["value"] for item in global_headers}
    csp = header_values.get("content-security-policy", "")
    require(header_values.get("x-content-type-options") == "nosniff",
            "Production responses must disable MIME sniffing.")
    require(header_values.get("x-frame-options") == "DENY" and "frame-ancestors 'none'" in csp,
            "Production pages must not be frameable.")
    require(header_values.get("referrer-policy") == "strict-origin-when-cross-origin",
            "Production responses must declare a referrer policy.")
    require("camera=()" in header_values.get("permissions-policy", "") and
            "microphone=()" in header_values.get("permissions-policy", ""),
            "Unused sensitive browser capabilities must be disabled.")
    require("default-src 'self'" in csp and "object-src 'none'" in csp and
            "base-uri 'self'" in csp,
            "The production CSP must restrict default, object, and base sources.")
    require("https://vbrezgsxbfxtfzfcmqce.supabase.co" in csp and
            "https://cdn.jsdelivr.net" in csp and "*" not in csp,
            "The CSP must use an explicit allowlist for application dependencies.")

    print("Security checks passed: 29 controls verified.")


if __name__ == "__main__":
    main()
