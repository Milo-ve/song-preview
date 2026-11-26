# 02_revisar: aprobar o rechazar un envío

Un trabajo: decidir si un release `pending` se publica.

## Inputs

- Working (este release): `/admin` → la fila `pending` → "Vista previa" (abre la página real con `?k=<previewKey>`)
- Referencia (siempre): `../../_shared/criterios-aprobacion.md`
- Estado general: `cd ../../site && npm run status` → `../_index.md`

No cargues: `site/` (código), `01_invitar/`, otros releases.

## Proceso

1. Abre la vista previa. Escucha el clip completo y mira la página en celular.
2. Repasa `criterios-aprobacion.md` punto por punto.
3. Corrige en `/admin` lo que haga falta (UPC, perfiles del artista, links manuales) antes de aprobar.
4. Aprueba → status `approved`; la página queda pública en modo "Próximamente".
   Rechaza → status `rejected`, y escríbele al artista explicándole qué cambiar para que vuelva a subir.

## Outputs

- El JSON del release en Blob con su status nuevo (`approved` o `rejected`).
- El link público, para mandárselo al artista: `<dominio>/<artista>/<cancion>`.

## Revisión humana

Esta etapa _es_ la revisión humana. Nada se publica sin que alguien haya escuchado el clip.
