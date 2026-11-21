# song-preview

Páginas de preview para canciones antes de su lanzamiento. Sirve para cualquier artista.

1. El artista entra a `/subir`, sube la portada y el audio, y elige el pedazo de 15–45 s que quiere mostrar. El audio se corta **en su navegador**, así que la canción completa nunca se sube.
2. El operador revisa en `/admin` y aprueba. La página queda pública en `/<artista>/<cancion>`, en modo "Próximamente".
3. Cuando la distribuidora activa el lanzamiento, la página encuentra el release por su **UPC** (Deezer + iTunes, sin API keys) y aparecen solos los botones de Spotify, Apple Music, YouTube Music, Deezer, Tidal, etc. (vía [Odesli](https://odesli.co)).

## Para operar

Empieza por [`CLAUDE.md`](CLAUDE.md). El pipeline del operador está en [`ops/`](ops/):

| Paso                                      | Qué haces                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| [`01_invitar`](ops/01_invitar/CONTEXT.md) | mandarle al artista el link, el código y el [mensaje](_shared/mensaje-invitacion.md) |
| [`02_revisar`](ops/02_revisar/CONTEXT.md) | escuchar la vista previa y aprobar o rechazar en `/admin`                            |
| [`03_lanzar`](ops/03_lanzar/CONTEXT.md)   | confirmar que los links aparecieron y compartir                                      |

Estado de todos los releases: `cd site && npm run status` (genera `ops/_index.md`, que no se sube a git).

## Instalar

Ver [`setup/questionnaire.md`](setup/questionnaire.md). En resumen: proyecto de Vercel con Root Directory `site`, un Blob store conectado y las env vars `UPLOAD_CODE`, `ADMIN_PASSWORD` y `NEXT_PUBLIC_SITE_URL`.

## Importar un release desde archivos

Sirve cuando el artista te manda los archivos en lugar de usar el formulario. Requiere `ffmpeg` y `.env.local` (`vercel env pull`).

```bash
cd site
npm run import-release -- \
  --artist "Nombre" --title "Canción" --date 2026-12-01 --email artista@example.com \
  --audio ~/Downloads/master.wav --start 1:19 --length 30 \
  --cover ~/Downloads/portada.jpg --upc 123456789012
```

Queda en `pending` y se revisa en `/admin` como cualquier envío. Con `--clip preview.mp3` se usa un clip ya cortado; con `--link spotify=https://…` se fijan links manuales; con `--status live` se publica directo.

## Desarrollo

Código en [`site/`](site/) (Next.js 16, TypeScript, Tailwind 4, Vercel Blob). Ver [`site/README.md`](site/README.md).

## Licencia

MIT
