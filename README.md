# El Universo de la Experiencia

Actividad independiente basada en la narrativa de la Guía de la Experiencia. Incluye el recorrido guiado, duelos orbitales, coordenadas de rol, ecosistema, observatorio de señales, misión 70/20/10 y pasaporte final.

Los resultados se almacenan en Supabase. El navegador conserva solo un identificador anónimo para reconocer las respuestas del mismo participante.

## Probar localmente

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Luego abra `http://127.0.0.1:4173/`. No requiere Node ni instalación de dependencias.

## Configurar Supabase

1. Ejecute [supabase/schema.sql](supabase/schema.sql) en el SQL Editor del proyecto de Supabase.
2. La aplicación usa la misma conexión pública de Supabase del proyecto Retox; si se utiliza otro proyecto, actualice `SUPABASE_URL` y `SUPABASE_KEY` en [app.js](app.js).
3. Cada avance y el pasaporte quedarán persistidos en Supabase.

## Publicar en Vercel

1. Cree un repositorio en GitHub y suba esta carpeta.
2. En Vercel, importe ese repositorio.
3. Seleccione **Framework Preset: Other**, deje vacío **Build Command** y establezca **Output Directory: `.`**.
4. Despliegue. Vercel publicará el sitio estático sin necesitar Node localmente.
