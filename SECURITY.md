# Seguridad del proyecto

## Arquitectura y límites de confianza

- El navegador solo se comunica con el endpoint de mismo origen `/api/rpc`.
- La función serverless expone una lista cerrada de nueve RPC y valida el
  método, origen, tipo, tamaño, nombres de campos y tipos antes de contactar a
  Supabase.
- La clave usada por la función es publicable, no `service_role`. Las tablas no
  conceden acceso a `anon` ni a `authenticated`; el acceso se realiza mediante
  funciones `security definer` con `search_path` vacío.
- Las palabras clave se verifican con bcrypt de costo 12 y su búsqueda utiliza
  HMAC-SHA-256 con un pepper privado almacenado en Supabase.
- Los tokens se generan aleatoriamente, solo se guarda su SHA-256 en la base de
  datos y el navegador los conserva en `sessionStorage`, no de forma persistente.
- La administración aplica bloqueo por intentos, límite global, expiración
  absoluta de ocho horas e inactividad máxima de treinta minutos.

## Controles del navegador y despliegue

- Todas las librerías se sirven localmente y sus versiones/hashes están en
  `vendor/README.md`.
- La CSP bloquea scripts de terceros y atributos ejecutables; también impide
  iframes, plugins, bases externas y conexiones fuera del mismo origen.
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
python scripts/check_scene.py --sweep --resize-sweep --integration --no-screenshot
```

Los controles automatizados reducen el riesgo, pero no sustituyen una prueba de
penetración ni la revisión de la configuración efectiva de Supabase y Vercel.

## Reporte responsable

No publique evidencias con datos reales. Reporte el hallazgo al responsable
técnico del proyecto indicando impacto, pasos de reproducción y entorno afectado.
