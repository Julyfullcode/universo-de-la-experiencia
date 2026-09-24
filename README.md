# El Universo de la Experiencia

Actividad independiente basada en la narrativa de la Guía de la Experiencia. Incluye el recorrido guiado, duelos orbitales, coordenadas de rol, ecosistema, observatorio de señales, misión 70/20/10 y pasaporte final.

Los resultados se almacenan en Supabase. Cada persona crea un acceso con su nombre completo y una palabra clave; para recuperar su viaje solo necesita esa palabra clave. La palabra clave se verifica con bcrypt y nunca se almacena en texto claro ni en el navegador. El navegador conserva solamente un token de sesión revocable, no permisos directos sobre las tablas.

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
La galaxia principal utiliza un único activo astrofotográfico transparente, sin
la ilustración galáctica anterior ni capas procedurales superpuestas. Las
constelaciones presentan dos figuras principales con puntos blancos y trazos
finos, acompañadas por un atlas zodiacal tenue y sin nombres visibles; sus líneas
unen proyecciones de estrellas a distintas profundidades.
El fondo espacial aprobado se conserva completo. Una máscara independiente
oscurece únicamente la zona central ocupada por el sistema para mantener legibles
sus cuerpos y órbitas sin sustituir ni apagar el cielo exterior.

Las órbitas y las posiciones comparten la misma ecuación. Las guías son bandas
tenues con transparencia gradual en los bordes, sin un trazo central definido.
Solo se dibujan si tienen un cuerpo asociado y corresponden a la escala visible:
el acercamiento a un planeta muestra únicamente las órbitas de sus propios satélites.
El encuadre considera la envolvente de las órbitas completas y el volumen de cada
objeto; reserva un margen inferior antes de la información y los controles.
Las traslaciones duran 48–94 segundos para satélites, 210–650 segundos para planetas
y 25 minutos para la estrella seleccionada. La Tierra también recorre una órbita
elíptica visible. Un cometa pequeño alterna cuatro rutas tridimensionales con una
aparición breve cada 52 segundos.
La pausa y la preferencia de movimiento reducido detienen la animación. En móvil,
las pestañas alternan las dos escalas y seleccionar un planeta permite acercarse.

La exploración del mapa no escribe datos; «Abrir actividad» conserva el recorrido
y el guardado existentes en Supabase. Si WebGL no está disponible, se muestran
accesos de texto a las actividades desbloqueadas.

Prueba visual y de ejecución, con Python y Microsoft Edge existentes:

```bash
python scripts/check_scene.py --width 1440 --height 900 --advance 120
python scripts/check_scene.py --sweep --resize-sweep --integration
python scripts/check_security.py
```

El comprobador usa un servidor local, captura WebGL, registra errores y posiciones
3D, y no escribe en Supabase. Los artefactos de prueba no se publican.
El barrido comprueba límites y selección de los 12 cuerpos durante 1.500 segundos
simulados en escritorio, pantalla baja y móvil; también valida guías sin dueño,
errores de materiales, carga de texturas y los ciclos de entrada/salida del mapa.

## Configurar Supabase

1. Ejecute [supabase/schema.sql](supabase/schema.sql) en el SQL Editor del proyecto de Supabase.
2. Despliegue inmediatamente después el frontend actualizado en Vercel. El cambio de firma de `universo_ingresar` exige coordinar ambas operaciones para evitar una ventana en la que la versión anterior y el esquema nuevo sean incompatibles.
3. La aplicación usa la conexión pública de Supabase configurada en [app.js](app.js) y [admin.js](admin.js). Si se utiliza otro proyecto, actualice la URL y la clave publicable en ambos archivos.
4. La migración desactiva el acceso anónimo directo a las tablas. La entrada, el progreso, la evaluación y la administración funcionan exclusivamente mediante RPC protegidas.
5. Cada avance, el pasaporte y la evaluación quedarán persistidos en Supabase.

Las sesiones vigentes continúan funcionando. Los accesos creados con el esquema anterior se actualizan automáticamente al recuperarse por primera vez solo con la palabra clave. Si varios recorridos antiguos compartían la misma palabra clave, no se entrega ninguno de forma ambigua y se requiere asistencia administrativa. Un recorrido aún más antiguo, sin palabra clave, puede asociarla una sola vez desde el mismo navegador que conserva su `client_id`; si ese identificador local ya no existe, se necesita un procedimiento administrativo de migración.

## Acceso y administración

- La portada solicita nombre y palabra clave al crear el acceso. Para recuperar un recorrido solicita únicamente la palabra clave, que debe ser exclusiva; no existe un mecanismo para mostrarla o enviarla posteriormente.
- La recuperación se bloquea temporalmente después de cinco intentos fallidos en 15 minutos. Las palabras clave deben tener entre 10 y 64 caracteres y un máximo de 72 bytes por la semántica de bcrypt.
- La opción **Evaluar experiencia** permite guardar o actualizar una calificación de 1 a 5 y una recomendación.
- El panel está disponible en `/admin.html`. Presenta indicadores, participantes activos, avance por momento, progreso individual y recomendaciones; se actualiza cada ocho segundos mientras la pestaña está visible.
- Los reportes de participantes y evaluaciones se descargan en CSV. Las celdas se neutralizan para impedir la ejecución de fórmulas al abrirlas en una hoja de cálculo.
- La contraseña administrativa nunca se incluye en el JavaScript ni se guarda en texto claro: Supabase conserva únicamente su hash bcrypt.

## Publicar en Vercel

1. Cree un repositorio en GitHub y suba esta carpeta.
2. En Vercel, importe ese repositorio y seleccione **Framework Preset: Other**.
3. Deje vacío **Build Command** y establezca **Output Directory: `.`**.
4. Despliegue. Vercel publicará el sitio estático y la función serverless
   `/api/rpc` definida en `api/rpc.js`; no se requiere un proyecto Next.js ni una
   instalación local de Node.
5. Los `push` posteriores a la rama de producción activarán nuevos despliegues.
