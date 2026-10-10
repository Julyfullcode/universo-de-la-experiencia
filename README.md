# El Universo de la Experiencia

Aplicación web de la Guía de la Experiencia de Grupo EPM. Incluye el recorrido
guiado, el mapa espacial 3D, el observatorio, la misión 70/20/10, la evaluación
y el pasaporte final.

## Arquitectura

- Frontend estático en HTML, CSS y JavaScript, sin proceso de compilación.
- Escena WebGL con Three.js r160 y texturas locales.
- Función serverless de mismo origen en `api/rpc.js`.
- Persistencia PostgreSQL en Supabase, con seis RPC públicas para participantes
  y un backend administrativo privado con MFA.
- Despliegue en Vercel mediante `vercel.json`.

El navegador no se conecta directamente a Supabase. Los participantes usan
`/api/rpc`, que restringe método, origen, contenido, tamaño y argumentos. Ese
proxy usa exclusivamente una clave publicable. El panel usa `/api/admin/*`,
con una conexión PostgreSQL exclusiva del servidor y el rol restringido
`universo_admin_backend`; no usa una clave `service_role`.

## Datos y sesiones

Cada participante crea o recupera un viaje mediante una palabra clave exclusiva.
La palabra se valida con bcrypt de costo 12 y no se guarda en texto claro. La
búsqueda usa HMAC-SHA-256 con un pepper privado de la base de datos. Los tokens
son aleatorios, Supabase conserva solo su hash SHA-256 y el navegador los mantiene
en `sessionStorage`, por lo que se eliminan al cerrar la pestaña.

Las tablas, índices, políticas, permisos, funciones y límites de uso están en
[supabase/schema.sql](supabase/schema.sql). Para una base ya creada, aplique
[supabase/migrations/20260928103000_endurecimiento_seguridad.sql](supabase/migrations/20260928103000_endurecimiento_seguridad.sql).

## Ejecución local

La interfaz puede revisarse con:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Abra `http://127.0.0.1:4173/`. El servidor estático permite revisar la interfaz,
pero las operaciones de datos requieren ejecutar o desplegar la función
serverless `/api/rpc` en un entorno compatible con Vercel.

## Dependencias y activos

Las dependencias del navegador se sirven localmente para que la aplicación no
ejecute código desde CDN:

- Three.js r160.
- html2canvas 1.4.1.
- jsPDF 4.2.1.

Sus versiones, hashes SHA-256 y licencias están documentados en
[vendor/README.md](vendor/README.md). Las texturas planetarias y sus fuentes se
documentan en [texture-credits.html](texture-credits.html) y
[assets/textures/README.md](assets/textures/README.md).

`assets/` contiene únicamente los recursos usados por la versión actual: logo,
favicon, fondos, pasaporte, galaxia y las siete texturas planetarias. No se
conservan ilustraciones antiguas ni duplicados de código o herramientas.

## Mapa 3D

Una sola escena representa la jerarquía galaxia → estrella cliente → planetas →
satélites. Los cuerpos usan materiales, iluminación, rotación y órbitas propias;
la Tierra incorpora una capa independiente de nubes. El fondo aprobado se
conserva y una máscara oscurece solo el centro para mejorar la lectura.

La escena incluye constelaciones, polvo cósmico, un cometa con cuatro rutas y
soporte para movimiento reducido. Si WebGL no está disponible, se muestran
accesos de texto a las actividades desbloqueadas.

## Administración

El panel está disponible en `/admin.html`. Conserva la cuenta administrativa
existente y su contraseña bcrypt; exige además un código TOTP antes de crear
una sesión. El segundo factor se cifra con AES-256-GCM y su clave permanece en
el servidor. Las cookies administrativas son `HttpOnly`, `Secure` y
`SameSite=Strict`; los tokens no se entregan a JavaScript.

Los límites compartidos en PostgreSQL combinan IP, dispositivo y usuario.
Los fallos generan retardos y bloqueos temporales de hasta quince minutos,
CAPTCHA adaptativo y eventos auditables. La presión contra una cuenta exige
CAPTCHA sin bloquear permanentemente a su administrador. Las peticiones
rechazadas no prolongan el bloqueo. Las alertas se agrupan y se envían a un
webhook HTTPS firmado; las que fallan permanecen en una cola para reintento.

La sesión vence a las ocho horas y después de treinta minutos sin solicitudes
administrativas válidas. El panel también cierra la sesión tras treinta minutos
sin interacción del usuario. Los reportes CSV neutralizan fórmulas.

### Activación administrativa

La segregación requiere aplicar la migración SQL y configurar el servidor en
el mismo cambio de despliegue. Sin las variables obligatorias, la nueva API
deniega el ingreso: no hay modo de omitir MFA ni CAPTCHA por falta de claves.

1. Instale Node.js 22 o posterior y ejecute `npm ci`.
2. Conserve una copia privada de la configuración y acceso de propietario a
   Supabase. Configure `ADMIN_BOOTSTRAP_DATABASE_URL` solo en la terminal de
   configuración; nunca en el frontend ni como conexión del backend.
3. Cree un widget Turnstile de producción para el dominio del panel y configure
   `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `ADMIN_ALLOWED_ORIGIN` y un
   receptor HTTPS en `ADMIN_ALERT_WEBHOOK_URL`.
4. Ejecute `npm run admin:setup`. El asistente confirma el factor en una
   aplicación autenticadora, aplica la migración
   `supabase/migrations/20261009120000_admin_segregado.sql`, crea el acceso SQL
   restringido y guarda las variables en `.env.admin.local`, excluido de Git.
   En una instalación nueva, establezca también `ADMIN_INITIAL_PASSWORD` en
   esa terminal (mínimo 16 caracteres y máximo 72 bytes UTF-8); en una existente,
   su ausencia conserva la contraseña actual.
5. Cargue las variables generadas en Vercel, configure el receptor para validar
   `X-Universe-Signature` (HMAC-SHA-256 del cuerpo exacto) y despliegue esta versión.
   La conexión SQL exige TLS con verificación del certificado; use
   `ADMIN_DATABASE_CA` si la base requiere su CA específica.
6. Compruebe contraseña + MFA, rechazo de RPC directa, CAPTCHA y recepción de
   alertas en producción. No reaplique una migración histórica por separado:
   las anteriores pueden restaurar permisos públicos; la migración de
   segregación debe ser siempre la última.

El asistente requiere terminal interactiva y no imprime contraseñas de base de
datos. La clave TOTP se muestra únicamente durante el alta. Respalde
`.env.admin.local` en un gestor de secretos; no lo comparta ni lo suba al repo.
Si la configuración falla después de guardar el archivo, consérvelo y revise
el estado SQL antes de intentar generar nuevas claves.

El cron protegido `/api/admin-maintenance` reintenta alertas y limpia registros
diariamente, compatible con Vercel Hobby. Las alertas nuevas se intentan enviar
durante la petición que las genera. Para reintentos frecuentes, programe
`npm run admin:alerts` cada cinco minutos en un worker con las variables del
servidor, o aumente la frecuencia del cron en un plan que lo permita. Un fallo
de entrega no elimina la alerta ni permite omitir controles de acceso.

La recuperación del factor requiere el propietario de la base y la
configuración original: `npm run admin:recover`. Confirma un nuevo TOTP, revoca
sesiones y desafíos anteriores y genera una alerta. No existe una ruta pública
de recuperación que permita eludir MFA. La versión actual mantiene la única
cuenta administrativa del sistema; las cuentas individuales requieren una
migración adicional del modelo de usuarios y sesiones.

## Configuración y despliegue

1. Cree o actualice la base con los archivos de `supabase/`.
2. En Vercel, importe el repositorio y seleccione **Framework Preset: Other**.
3. Deje vacío **Build Command** y use `.` como **Output Directory**.
4. Configure opcionalmente `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` siguiendo
   [.env.example](.env.example). No configure secretos de administración.
5. Despliegue y compruebe `/`, `/admin.html` y `/api/rpc`.

Los encabezados de seguridad, la política CSP y las reglas de caché se definen en
`vercel.json`. `.vercelignore` limita el artefacto de producción a los archivos
necesarios para ejecutar la aplicación.

## Verificación

```powershell
python scripts/check_security.py
npm test
python scripts/check_scene.py --sweep --resize-sweep --integration --no-screenshot
```

El primer comando audita arquitectura, almacenamiento, RPC, CSP, dependencias y
activos. Las pruebas Node verifican la API administrativa y aplican el esquema
y las migraciones sobre PostgreSQL local con pgcrypto. El comando de escena
abre la aplicación en Microsoft Edge, comprueba errores de
JavaScript/WebGL, límites visuales, carga de texturas, navegación y persistencia
simulada sin escribir en Supabase.

Consulte [SECURITY.md](SECURITY.md) para los límites de confianza, controles y
recomendaciones operativas. Estas comprobaciones reducen el riesgo, pero no
sustituyen una revisión independiente ni una prueba de penetración.
