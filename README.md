# El Universo de la Experiencia

Actividad independiente basada en la narrativa de la Guía de la Experiencia. Incluye el recorrido guiado, duelos orbitales, coordenadas de rol, ecosistema, observatorio de señales, misión 70/20/10 y pasaporte final.

Los resultados se almacenan en Supabase. Cada persona entra con su nombre completo y correo; si el correo ya existe, recupera su viaje y continúa desde el avance guardado. El navegador conserva un token de sesión revocable, no permisos directos sobre las tablas.

## Probar localmente

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Luego abra `http://127.0.0.1:4173/`. No requiere Node ni instalación de dependencias.

## Mapa 3D

El mapa usa Three.js r160, incluido en `vendor/` con su licencia MIT. Una sola
escena representa la jerarquía galaxia → estrellas cliente → planetas empleados
→ satélites de otros actores. La vista ampliada sigue la posición de la misma
estrella señalada en la galaxia; no es otro sistema independiente. Los planetas son
mallas 3D opacas con mapas equirectangulares 2K, iluminación y rotación propia.
La Tierra incluye continentes reales y una capa de nubes con movimiento independiente.
Las texturas y su licencia están documentadas en [los créditos](texture-credits.html).
Las constelaciones son
líneas en pantalla que unen proyecciones de estrellas a distintas profundidades.

Las órbitas y las posiciones comparten la misma ecuación. Las guías son bandas
tenues con transparencia gradual en los bordes, sin un trazo central definido.
Solo se dibujan si tienen un cuerpo asociado y corresponden a la escala visible:
el acercamiento a un planeta muestra únicamente las órbitas de sus propios satélites.
El encuadre considera la envolvente de las órbitas completas y el volumen de cada
objeto; reserva un margen inferior antes de la información y los controles.
Las traslaciones duran 48–94 segundos para satélites, 210–650 segundos para planetas
y 25 minutos para la estrella seleccionada.
La pausa y la preferencia de movimiento reducido detienen la animación. En móvil,
las pestañas alternan las dos escalas y seleccionar un planeta permite acercarse.

La exploración del mapa no escribe datos; «Abrir actividad» conserva el recorrido
y el guardado existentes en Supabase. Si WebGL no está disponible, se muestran
accesos de texto a las actividades desbloqueadas.

Prueba visual y de ejecución, con Python y Microsoft Edge existentes:

```bash
python scripts/check_scene.py --width 1440 --height 900 --advance 120
python scripts/check_scene.py --sweep --resize-sweep --integration
```

El comprobador usa un servidor local, captura WebGL, registra errores y posiciones
3D, y no escribe en Supabase. Los artefactos de prueba no se publican.
El barrido comprueba límites y selección de los 12 cuerpos durante 1.500 segundos
simulados en escritorio, pantalla baja y móvil; también valida guías sin dueño,
errores de materiales, carga de texturas y los ciclos de entrada/salida del mapa.

## Configurar Supabase

1. Ejecute [supabase/schema.sql](supabase/schema.sql) en el SQL Editor del proyecto de Supabase.
2. La aplicación usa la conexión pública de Supabase configurada en [app.js](app.js) y [admin.js](admin.js). Si se utiliza otro proyecto, actualice la URL y la clave publicable en ambos archivos.
3. La migración desactiva el acceso anónimo directo a las tablas. La entrada, el progreso, la evaluación y la administración funcionan exclusivamente mediante RPC protegidas.
4. Cada avance, el pasaporte y la evaluación quedarán persistidos en Supabase.

## Acceso y administración

- La portada registra un correo nuevo o recupera el recorrido asociado a un correo existente.
- La opción **Evaluar experiencia** permite guardar o actualizar una calificación de 1 a 5 y una recomendación.
- El panel está disponible en `/admin.html`. Presenta indicadores, participantes activos, avance por momento, progreso individual y recomendaciones; se actualiza cada ocho segundos mientras la pestaña está visible.
- Los reportes de participantes y evaluaciones se descargan en CSV. Las celdas se neutralizan para impedir la ejecución de fórmulas al abrirlas en una hoja de cálculo.
- La contraseña administrativa nunca se incluye en el JavaScript ni se guarda en texto claro: Supabase conserva únicamente su hash bcrypt.

## Publicar en Vercel

1. Cree un repositorio en GitHub y suba esta carpeta.
2. En Vercel, importe ese repositorio.
3. Seleccione **Framework Preset: Other**, deje vacío **Build Command** y establezca **Output Directory: `.`**.
4. Despliegue. Vercel publicará el sitio estático sin necesitar Node localmente.
