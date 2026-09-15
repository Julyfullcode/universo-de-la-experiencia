# El Universo de la Experiencia

Actividad independiente basada en la narrativa de la Guía de la Experiencia. Incluye el recorrido guiado, duelos orbitales, coordenadas de rol, ecosistema, observatorio de señales, misión 70/20/10 y pasaporte final.

Los resultados se almacenan en Supabase. El navegador conserva solo un identificador anónimo para reconocer las respuestas del mismo participante.

## Probar localmente

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Luego abra `http://127.0.0.1:4173/`. No requiere Node ni instalación de dependencias.

## Mapa 3D

El mapa usa Three.js r160, incluido en `vendor/` con su licencia MIT. Una sola
escena representa la jerarquía galaxia → estrellas cliente → planetas empleados
→ satélites de otros actores. La vista ampliada sigue la posición de la misma
estrella señalada en la galaxia; no es otro sistema independiente. Las superficies
son mallas 3D con materiales procedurales y rotación propia. Las constelaciones son
líneas en pantalla que unen proyecciones de estrellas a distintas profundidades.

Las órbitas y las posiciones comparten la misma ecuación. Las traslaciones duran
entre 48 segundos (satélite interior) y 25 minutos (estrella seleccionada).
La pausa y la preferencia de movimiento reducido detienen la animación. En móvil,
las pestañas alternan las dos escalas y seleccionar un planeta permite acercarse.

La exploración del mapa no escribe datos; «Abrir actividad» conserva el recorrido
y el guardado existentes en Supabase. Si WebGL no está disponible, se muestran
accesos de texto a las actividades desbloqueadas.

Prueba visual y de ejecución, con Python y Microsoft Edge existentes:

```bash
python scripts/check_scene.py --width 1440 --height 900 --advance 120
```

El comprobador usa un servidor local, captura WebGL, registra errores y posiciones
3D, y no escribe en Supabase. Los artefactos de prueba no se publican.

## Configurar Supabase

1. Ejecute [supabase/schema.sql](supabase/schema.sql) en el SQL Editor del proyecto de Supabase.
2. La aplicación usa la misma conexión pública de Supabase del proyecto Retox; si se utiliza otro proyecto, actualice `SUPABASE_URL` y `SUPABASE_KEY` en [app.js](app.js).
3. Cada avance y el pasaporte quedarán persistidos en Supabase.

## Publicar en Vercel

1. Cree un repositorio en GitHub y suba esta carpeta.
2. En Vercel, importe ese repositorio.
3. Seleccione **Framework Preset: Other**, deje vacío **Build Command** y establezca **Output Directory: `.`**.
4. Despliegue. Vercel publicará el sitio estático sin necesitar Node localmente.
