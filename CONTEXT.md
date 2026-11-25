# El pipeline de un release

La unidad de trabajo es un **release**: una canción de un artista. Cada release es un archivo JSON en Vercel Blob (`releases/<artista>/<cancion>.json`); el modelo está en `site/lib/release.ts`.

```
01_invitar ──► (artista sube en /subir) ──► 02_revisar ──► (distribuidora activa) ──► 03_lanzar
 operador        status: pending              operador        status: approved          live
```

## Estados

| status     | Significa                                     | Página pública                       | Quién lo mueve                              |
| ---------- | --------------------------------------------- | ------------------------------------ | ------------------------------------------- |
| `pending`  | el artista ya subió y falta revisar           | 404 (solo vista previa con `?k=`)    | el formulario `/subir`                      |
| `approved` | aprobado y en línea en modo "Próximamente"    | visible, sin links (pre-save si hay) | operador en `/admin`                        |
| `live`     | ya se encontró al menos un link de plataforma | visible, con links                   | automático (búsqueda por UPC) o el operador |
| `rejected` | no se publica                                 | 404                                  | operador en `/admin`                        |

## Cómo aparecen los links solos

1. El release tiene `upc` (o el operador lo agrega en `/admin`).
2. Cada hora la página busca ese UPC:

   | Plataforma                    | Fuente                                                         | ¿Necesita llave?                                                |
   | ----------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
   | Deezer                        | `api.deezer.com/album/upc:<UPC>`                               | no                                                              |
   | Apple Music                   | `itunes.apple.com/lookup?upc=<UPC>`                            | no                                                              |
   | Spotify                       | Spotify Web API, búsqueda `upc:<UPC>`                          | sí: `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET` (gratis)      |
   | YouTube Music, Tidal, Amazon… | Odesli (`api.song.link`) a partir de cualquier link encontrado | sí: `ODESLI_API_KEY` (su API sin llave se cerró y responde 401) |

3. En cuanto aparece un link, el release pasa a `live`.
4. Los links manuales (`linkOverrides` en `/admin`) siempre ganan sobre los automáticos. Las plataformas sin fuente automática se cubren con links manuales.

Código: `site/lib/links.ts`.

## Qué se carga en cada paso

Cada `ops/NN_*/CONTEXT.md` dice qué leer. No cargues `site/` para operar; no cargues `ops/` para programar.
