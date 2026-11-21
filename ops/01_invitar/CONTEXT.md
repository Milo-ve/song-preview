# 01_invitar: darle al artista lo que necesita para subir

Un trabajo: que el artista tenga el link de `/subir`, el código de acceso y la lista de qué preparar.

## Inputs

- Referencia (siempre): `../../_shared/mensaje-invitacion.md`: la plantilla del mensaje
- Referencia (siempre): `../../_shared/checklist-artista.md`: lo que el artista debe tener a la mano
- Dato: el código de acceso vigente es la env var `UPLOAD_CODE` en Vercel (`vercel env ls` / dashboard). No se escribe en ningún archivo del repo.

No cargues: `site/`, otros releases, `02_revisar/`.

## Proceso

1. Copia `mensaje-invitacion.md` y reemplaza `{nombre}`, `{url}` y `{codigo}`.
2. Mándalo por WhatsApp o email.
3. Si el artista no puede usar el formulario (por ejemplo, desde un celular viejo), pídele los archivos y súbelos tú mismo en `/subir` con sus datos.

## Outputs

- Ninguno en archivos. El siguiente estado aparece solo cuando el artista envía: un release `pending` en `/admin`.

## Revisión humana

Antes de mandar el mensaje, confirma que el código y la URL sean los vigentes.
