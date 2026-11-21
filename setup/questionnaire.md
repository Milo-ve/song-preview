# Setup: configurar el sistema una sola vez

Las respuestas se guardan como env vars en Vercel (proyecto `song-preview`, Root Directory = `site`). Ninguna va en git.

| #   | Pregunta                                            | Dónde queda                                                                             |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | ¿Qué código de acceso les vas a dar a los artistas? | `UPLOAD_CODE`                                                                           |
| 2   | ¿Cuál es el password de `/admin`?                   | `ADMIN_PASSWORD`                                                                        |
| 3   | ¿Con qué dominio se comparten las páginas?          | `NEXT_PUBLIC_SITE_URL` (ej. `https://song-preview.vercel.app`)                          |
| 4   | Blob store                                          | `BLOB_READ_WRITE_TOKEN`: lo pone Vercel al conectar el store (Storage → Blob → Connect) |

Opcionales (más links automáticos):

| Variable | Para qué | Cómo se obtiene |
|---|---|---|
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | link de Spotify automático por UPC | developer.spotify.com → Create app (gratis) |
| `ODESLI_API_KEY` | YouTube Music, Tidal, Amazon automáticos | pedirla a Odesli (odesli.co); su API sin llave se cerró |

## Pasos

1. `cd site && vercel link` (o importar el repo en vercel.com con Root Directory `site`).
2. Crea el Blob store y conéctalo al proyecto (dashboard → Storage).
3. `vercel env add UPLOAD_CODE`, `vercel env add ADMIN_PASSWORD`, `vercel env add NEXT_PUBLIC_SITE_URL` (y las opcionales).
4. `vercel env pull .env.local` para desarrollo local.
5. Opcional: importa *Tal Vez Un Té* como primer release (ver `README.md` → "Importar un release desde archivos").

Para cambiar el código de acceso basta con editar `UPLOAD_CODE` y redeployar. Los releases ya subidos no se tocan.
