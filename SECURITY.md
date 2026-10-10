# Seguridad del proyecto

## Arquitectura y límites de confianza

- El navegador usa `/api/rpc` para participantes y `/api/admin/*` para el panel.
- El proxy público expone una lista cerrada de seis RPC y valida el
  método, origen, tipo, tamaño, nombres de campos y tipos antes de contactar a
  Supabase.
- La clave usada por el proxy público es publicable, no `service_role`. Las tablas no
  conceden acceso a `anon` ni a `authenticated`; el acceso se realiza mediante
  funciones `security definer` con `search_path` vacío.
- Las palabras clave se verifican con bcrypt de costo 12 y su búsqueda utiliza
  HMAC-SHA-256 con un pepper privado almacenado en Supabase.
- Los tokens se generan aleatoriamente y solo se guarda su SHA-256 en la base.
  Los de participantes usan `sessionStorage`; los administrativos usan cookies
  firmadas `HttpOnly`, `Secure` y `SameSite=Strict`.
- La administración usa un rol SQL privado sin privilegios de superusuario ni
  acceso directo a las tablas de participantes. Las RPC administrativas no
  pueden ejecutarse por `PUBLIC`, `anon` ni `authenticated`. La función antigua
  de ingreso por contraseña tampoco está permitida al backend nuevo.
- El ingreso administrativo exige contraseña bcrypt y TOTP verificado mediante
  OTPAuth. El factor se cifra con AES-256-GCM y una clave independiente de las
  firmas de cookies. La creación de sesión consume el contador TOTP bajo un
  bloqueo de fila para impedir reutilización entre desafíos simultáneos.
- Los límites y bloqueos usan PostgreSQL compartido, operaciones atómicas y
  bloqueo ordenado de contadores. No dependen de la memoria de una instancia.
  La cuenta bajo ataque requiere CAPTCHA, sin bloqueo permanente ni renovación
  del bloqueo por solicitudes rechazadas. IP y dispositivo siguen sujetos a
  límites aunque cambie el usuario. El dispositivo es una cookie firmada y no
  una prueba de identidad; eliminarla no borra los otros límites.
- La API administrativa exige Origin exacto, encabezado propio y JSON. Obtiene
  la IP del encabezado sobrescrito por Vercel y deniega su uso fuera de esa
  plataforma. MFA y la sesión nunca se sustituyen por CAPTCHA o dispositivo.
- BotID Basic verifica todos los ingresos mediante el contexto de Vercel y OIDC,
  sin bypass de desarrollo, también en Preview. Se exige una respuesta completa
  que clasifique al cliente como humano; no se permiten bots verificados en el
  acceso administrativo. No se habilita Deep Analysis de pago. La alternativa
  Turnstile valida dominio y acción. Un fallo del proveedor deniega el ingreso.
  BotID Basic verifica integridad del desafío; no ofrece la detección avanzada
  de Deep Analysis. MFA y los límites compartidos siguen siendo obligatorios.
- La sesión administrativa vence a las ocho horas y a los treinta minutos sin
  solicitudes válidas. El frontend aplica además treinta minutos sin interacción.
- Los eventos no guardan contraseñas, códigos TOTP ni tokens. Los identificadores
  de origen y cuenta usan HMAC. Las alertas se agrupan por evento y cuenta cada
  quince minutos y se envían por Resend a destinatarios configurados en el
  servidor, o a un webhook HTTPS firmado con una clave propia. El correo incluye
  evento, fecha y referencia; nunca datos de participantes. Los reintentos usan
  una clave de idempotencia estable. Los
  fallos de entrega se conservan para reintento; el receptor debe deduplicar por
  alert_id. Los fallos de base/worker se registran también en los logs de Vercel.

## Controles del navegador y despliegue

- Las librerías de la escena se sirven localmente y sus versiones/hashes están
  en `vendor/README.md`. BotID usa el módulo oficial fijado en `package-lock.json`
  y rutas del mismo origen que Vercel redirige a su servicio de desafíos.
- La CSP pública bloquea scripts de terceros, atributos ejecutables e iframes.
  Solo `/admin.html` permite el script/iframe/conexión de Turnstile y desactiva
  COEP para ese desafío; mantiene la prohibición de atributos ejecutables y
  de que terceros enmarquen el panel. La escena pública conserva su aislamiento.
- HSTS, COOP, COEP, CORP, `nosniff`, `no-referrer` y Permissions Policy se
  configuran en `vercel.json`.
- `.vercelignore` excluye migraciones, herramientas, documentación y archivos
  de entorno del artefacto publicado.

## Secretos y operación

- Nunca deben almacenarse en Git claves `service_role`, contraseñas, cadenas de
  conexión ni tokens personales. La clave publicable no concede acceso directo a
  las tablas y puede configurarse como variable de entorno.
- Aplique las migraciones de `supabase/` con una identidad autorizada y cierre
  la sesión de despliegue al terminar.
- Revise periódicamente avisos de jsPDF, html2canvas y Three.js. No actualice
  Three.js sin repetir las pruebas WebGL y visuales.

## Verificación

```powershell
python scripts/check_security.py
npm test
python scripts/check_admin.py
python scripts/check_scene.py --sweep --resize-sweep --integration --no-screenshot
```

Los controles automatizados reducen el riesgo, pero no sustituyen una prueba de
penetración ni la revisión de la configuración efectiva de Supabase y Vercel.

## Activación y recuperación administrativa

El código y la migración requieren despliegue coordinado. La nueva API devuelve
503 si faltan la conexión privada, las claves separadas, el origen HTTPS, las
configuración del proveedor elegido de CAPTCHA/alertas o el secreto del cron. Las claves de
prueba de CAPTCHA están prohibidas. No activar quitando temporalmente MFA.

`npm run admin:setup` es un asistente local interactivo de propietario, no un
endpoint. Conserva la contraseña existente y confirma el factor antes de
aplicar permisos. Genera `.env.admin.local`, excluido de Git y del despliegue.
Respalde las claves en un gestor de secretos. Nunca utilice una conexión de
propietario como `ADMIN_DATABASE_URL`: solo el rol `universo_admin_backend`.

`npm run admin:recover` requiere la configuración original y conexión de
propietario. Confirma otro TOTP, revoca sesiones/desafíos y registra una alerta;
no permite recuperación pública por contraseña o CAPTCHA. La cuenta existente
sigue siendo única; no se atribuyen acciones a administradores individuales.

La entrega inicial de alertas se intenta durante la petición. El cron incluido
reintenta y limpia diariamente; para menor demora ante fallos del receptor,
ejecute el worker cada cinco minutos o configure un cron con esa frecuencia en
un plan compatible. Supervise los logs de indisponibilidad del backend y del
worker mediante la plataforma de monitoreo de producción. La cola evita pérdida
de eventos, pero no garantiza entrega si el receptor permanece indisponible.

Los registros ordinarios se conservan treinta días; las alertas pendientes se
preservan hasta entregarlas. BotID implica procesamiento por Vercel, Resend
procesa los correos de alerta y la alternativa Turnstile usa Cloudflare. Los
proveedores elegidos deben figurar en la información de privacidad del panel. Los ataques
volumétricos requieren además controles en el borde de Vercel: los límites de
aplicación no sustituyen la protección de capacidad del proveedor.

## Reporte responsable

No publique evidencias con datos reales. Reporte el hallazgo al responsable
técnico del proyecto indicando impacto, pasos de reproducción y entorno afectado.
