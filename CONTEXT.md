# El pipeline de un release

La unidad de trabajo es un **release**: una canción de un artista. Cada release es un archivo JSON en Vercel Blob (`releases/<artista>/<cancion>.json`); el modelo está en `site/lib/release.ts`.

```
01_invitar ──► (artista sube en /subir) ──► 02_revisar ──► (distribuidora activa) ──► 03_lanzar
 operador        status: pending              operador        status: approved          live
```

## Estados

| status     | Significa                                     | Página pública                    | Quién lo mueve                              |
| ---------- | --------------------------------------------- | --------------------------------- | ------------------------------------------- |
| `pending`  | el artista ya subió y falta revisar           | 404 (solo vista previa con `?k=`) | el formulario `/subir`                      |
| `approved` | aprobado y en línea en modo "Próximamente"    | visible, sin links                | operador en `/admin`                        |
| `live`     | ya se encontró al menos un link de plataforma | visible, con links                | automático (búsqueda por UPC) o el operador |
| `rejected` | no se publica                                 | 404                               | operador en `/admin`                        |

## Cómo aparecen los links solos

1. El release tiene `upc` (o el operador lo agrega en `/admin`).
2. Cada hora (ISR) la página consulta `api.deezer.com/album/upc:<UPC>` e `itunes.apple.com/lookup?upc=<UPC>`, sin API key.
3. Si alguna responde, esa URL se manda a Odesli (`api.song.link`), que devuelve Spotify, Apple Music, YouTube Music, Deezer, Amazon, Tidal, etc.
4. Los links manuales (`linkOverrides`) siempre ganan sobre los automáticos.

Código: `site/lib/links.ts`.

## Qué se carga en cada paso

Cada `ops/NN_*/CONTEXT.md` dice qué leer. No cargues `site/` para operar; no cargues `ops/` para programar.
