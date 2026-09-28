# El Universo de la Experiencia

Aplicación web de la Guía de la Experiencia de Grupo EPM. Incluye el recorrido
guiado, el mapa espacial 3D, el observatorio, la misión 70/20/10, la evaluación
y el pasaporte final.

## Arquitectura

- Frontend estático en HTML, CSS y JavaScript, sin proceso de compilación.
- Escena WebGL con Three.js r160 y texturas locales.
- Función serverless de mismo origen en `api/rpc.js`.
- Persistencia PostgreSQL en Supabase, expuesta únicamente mediante nueve RPC
  permitidas y funciones `security definer` endurecidas.
- Despliegue en Vercel mediante `vercel.json`.

El navegador no se conecta directamente a Supabase. Todas las solicitudes pasan
por `/api/rpc`, que restringe método, origen, tipo de contenido, tamaño, forma de
los argumentos y RPC permitidas. La función usa exclusivamente una clave
publicable; nunca debe recibir una clave `service_role`.

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

El panel está disponible en `/admin.html`. Las contraseñas administrativas se
guardan únicamente como hashes bcrypt. El acceso aplica límites por usuario y
globales, comparación de costo constante para usuarios inexistentes, una sola
sesión activa, vencimiento absoluto de ocho horas e inactividad máxima de treinta
minutos. Los reportes CSV neutralizan celdas que podrían ejecutar fórmulas.

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
python scripts/check_scene.py --sweep --resize-sweep --integration --no-screenshot
```

El primer comando audita arquitectura, almacenamiento, RPC, CSP, dependencias y
activos. El segundo abre la aplicación en Microsoft Edge, comprueba errores de
JavaScript/WebGL, límites visuales, carga de texturas, navegación y persistencia
simulada sin escribir en Supabase.

Consulte [SECURITY.md](SECURITY.md) para los límites de confianza, controles y
recomendaciones operativas. Estas comprobaciones reducen el riesgo, pero no
sustituyen una revisión independiente ni una prueba de penetración.
