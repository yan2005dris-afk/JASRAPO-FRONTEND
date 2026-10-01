# shared/infrastructure/

Servicios cross-feature que interactúan con APIs del navegador o servicios
externos no-Angular (no HTTP). Es el equivalente shared de la capa `data/`
de un feature.

Reglas:

- Solo servicios que NO sean HTTP puro. Si hace `HttpClient`, va en el
  feature (`data/`).
- Ejemplos válidos: `BlobDownloadService` (usa `URL.createObjectURL`),
  `IndexedDbService` (usa `window.indexedDB`).
- Cero dependencias con features específicos.
- Si la lógica de negocio es no-trivial, extraer a `shared/utils/`.

## Diferencia con `shared/services/`

`shared/services/` es el patrón legacy del repo (legado de los primeros
servicios). Convive con este folder; no se migra retroactivamente. Los
servicios NUEVOS van en `infrastructure/`.