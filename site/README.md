# site/: la app de song-preview

Next.js 16 + Vercel Blob. Lee `AGENTS.md` antes de tocar código y `../CLAUDE.md` para entender el sistema.

| Ruta | Qué hace |
|---|---|
| `/subir` | formulario del artista: corta el clip y redimensiona la portada **en el navegador** y sube a Blob |
| `/[artist]/[song]` | página pública (o vista previa con `?k=`) |
| `/admin` | revisión del operador (password `ADMIN_PASSWORD`) |
| `/api/upload` | emite tokens de subida directa a Blob (código `UPLOAD_CODE`) |

| Archivo | Papel |
|---|---|
| `lib/release.ts` | el modelo y los schemas: fuente única de los campos |
| `lib/links.ts` | cómo aparecen los links solos: UPC → Deezer/Apple (sin llave), Spotify y Odesli (con llave) |
| `lib/store.ts` | lectura y escritura de releases en Blob |
| `lib/audio/clip.ts`, `lib/image.ts` | procesamiento en el navegador |

```bash
vercel env pull .env.local   # BLOB_READ_WRITE_TOKEN, UPLOAD_CODE, ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL
npm run dev
npm run typecheck && npm test && npm run lint && npm run build
```
