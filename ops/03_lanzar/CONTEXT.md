# 03_lanzar: confirmar que los links aparecieron

Un trabajo: cuando la distribuidora activa el lanzamiento, verificar que la página muestre los links correctos.

## Inputs

- Working (este release): `/admin` → la fila del release (UPC, links detectados)
- Referencia: `../../CONTEXT.md` → sección "Cómo aparecen los links solos"

No cargues: `site/` salvo que haya que arreglar la detección.

## Proceso

1. En `/admin`, presiona "Buscar links ahora". Esto revalida la página sin esperar la hora del ISR.
2. Si salen links, el release pasa a `live` solo. Abre cada botón y confirma que lleva a la canción correcta.
3. Si no sale nada:
   - Revisa que el UPC sea el que dio la distribuidora (a veces confunden UPC con ISRC).
   - Las plataformas tardan de horas a días en indexar. Vuelve a intentarlo mañana.
   - Si ya ves la canción en Spotify o Apple Music, pega esa URL como link manual en `/admin`. Con eso Odesli completa las demás.
4. Si un link automático está mal, sobrescríbelo con un link manual.

## Outputs

- Release en `live`, con los links visibles en la página pública.

## Revisión humana

Da clic a cada link desde el celular antes de compartir la página.
