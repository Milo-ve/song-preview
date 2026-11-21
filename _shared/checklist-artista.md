# Checklist del artista

La fuente de verdad de los campos y sus límites es el schema en `site/lib/release.ts` (`submissionSchema`). Si cambias un límite, cámbialo allá y actualiza esta lista.

| Qué                  | Obligatorio      | Notas                                                                                          |
| -------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| Nombre artístico     | sí               | como aparece en las plataformas                                                                |
| Título de la canción | sí               |                                                                                                |
| Audio                | sí               | WAV, MP3, AIFF o FLAC. Se procesa en el navegador; solo se sube el clip elegido (15–45 s, MP3) |
| Portada              | sí               | cuadrada, mínimo 1400×1400. Se redimensiona sola a 1400 px                                     |
| Fecha de lanzamiento | sí               |                                                                                                |
| Distribuidora        | no               | DistroKid, ONErpm, CD Baby, TuneCore, Symphonic…                                               |
| UPC                  | no (recomendado) | 12–13 dígitos. Es el que hace que los links aparezcan solos                                    |
| ISRC                 | no               |                                                                                                |
| Email de contacto    | sí               | para avisarle cuando la página esté publicada                                                  |
