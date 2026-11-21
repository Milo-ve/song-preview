# song-preview

Páginas de preview para canciones de cualquier artista. El artista sube su canción y su portada en `/subir`, el operador aprueba en `/admin` y la página queda en `dominio/<artista>/<cancion>`. Cuando la distribuidora activa el lanzamiento, los links a plataformas aparecen solos (UPC → Deezer/iTunes → Odesli).

Construido con ICM: las carpetas llevan el orden, cada carpeta explica su trabajo en su `CONTEXT.md` y el estado se puede leer en archivos.

## Dónde vive cada cosa

| Carpeta      | Qué guarda                                                       |
| ------------ | ---------------------------------------------------------------- |
| `CONTEXT.md` | el pipeline en una pantalla + ciclo de estados de un release     |
| `ops/`       | pipeline del operador, en orden (01 → 03)                        |
| `_shared/`   | fábrica: mensajes al artista, checklist, criterios de aprobación |
| `setup/`     | configuración única del sistema (env vars, Blob, dominio)        |
| `site/`      | el producto: app Next.js 16 (Vercel, Root Directory = `site`)    |

## Ruteo por lo que acaba de pasar

| Si                                      | Ve a                                                      | Para en                                          |
| --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| un artista quiere su página             | `ops/01_invitar/CONTEXT.md`                               | el artista recibió el mensaje                    |
| llegó un envío nuevo (status `pending`) | `ops/02_revisar/CONTEXT.md`                               | aprobado o rechazado en `/admin`                 |
| la distribuidora activó el lanzamiento  | `ops/03_lanzar/CONTEXT.md`                                | links verificados, link compartido               |
| te piden el estado                      | `cd site && npm run status` → `ops/_index.md`             | reporta lo que existe                            |
| instalar el sistema desde cero          | `setup/questionnaire.md`                                  | env vars en Vercel                               |
| cambiar código                          | `site/AGENTS.md`, luego `site/lib/release.ts` (el modelo) | `npm run typecheck && npm test && npm run build` |

## Reglas

- Ninguna página se hace pública sin que una persona la revise en `/admin`.
- El repo es **público**: los archivos de artistas y la metadata de lanzamientos no publicados viven en Vercel Blob, nunca en git.
- `ops/_index.md` lo genera un script; no se edita a mano.
