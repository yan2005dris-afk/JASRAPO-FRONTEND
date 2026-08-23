# Flujos Offline — Tarea de Implementación

Rama: `PWA-operadores`
Fecha: 2026-06-21

---

## Schema actual de IndexedDB

Seis stores ya configurados en `IndexedDbService`:

| Store | Uso |
|---|---|
| `medidores_cache` | Todos los medidores del operario (se sincroniza al conectar) |
| `lecturas_registradas` | Lecturas traídas del servidor (estado, valores) |
| `lecturas_pendientes` | Lecturas creadas/editadas sin sincronizar |
| `anomalias_pendientes` | Anomalías creadas sin sincronizar |
| `lecturas_sincronizadas` | Archivo de lecturas ya sincronizadas con éxito |
| `estados_cache` | Catálogo de estados de lectura (`EstadoLectura`) |

**Stores que faltan agregar:**

| Store | Uso |
|---|---|
| `tareas_cache` | Lista de tareas del operario (`TaskResponse[]`) |
| `novedades_cache` | Lecturas con anomalías pendientes (`ReadingWithAnomaly[]`) |
| `tareas_pendientes` | Cambios de estado de tarea sin sincronizar |

---

## Puntos de sincronización

`OperatorSyncService`:
- `syncCatalogAndReadings()` — corre al conectarse por primera vez; llena `medidores_cache`, `lecturas_registradas`, `estados_cache`
- `syncPendingData()` — corre al reconectar; vacía `lecturas_pendientes` y `anomalias_pendientes`
- `submitReading(data)` — online: `POST/PATCH /operator/readings`; offline: encola en `lecturas_pendientes`
- `submitAnomaly(data)` — online: `POST /reading-anomalies`; offline: encola en `anomalias_pendientes`

---

## Estado de los flujos

### LISTO — Ya funciona offline

| Flujo | Cómo |
|---|---|
| Geolocalización del usuario en el mapa | `navigator.geolocation.watchPosition` — GPS puro, sin red |
| Lista de medidores (buscador) | Servida desde `medidores_cache` via `MeterCacheService` |
| Estado de lecturas en el mapa | Resuelto desde `lecturas_registradas` → `estados_cache` en `tasks.component.ts` |
| Enviar lectura (crear) | `submitReading` encola en `lecturas_pendientes` cuando offline |
| Enviar lectura (editar) | Igual que el anterior — la cola se mergea por `medidorId` |
| Enviar anomalía (crear) | `submitAnomaly` encola en `anomalias_pendientes` cuando offline |
| Auto-sync al reconectar | `NetworkService` dispara `syncPendingData()` con el evento `online` |

---

### PENDIENTE — Flujos que se rompen sin conexión

---

#### T-1: Lista de tareas (`/app/operador/tareas`)

**Flujo online:** `GET /operator/tasks` → render en `tasks.component.ts`.

**Brecha offline:** El componente solo llama a la API; sin fallback en IDB. La lista aparece vacía.

**Implementación:**

1. Agregar store `tareas_cache` en `IndexedDbService` (clave: `rutaId`, valor: `TaskResponse`).
2. En `syncCatalogAndReadings()`, después del sync de medidores: `GET /operator/tasks` → escribir todos los resultados en `tareas_cache`.
3. En `tasks.component.ts` método `loadTasks()`:
   - Online: fetch API → escribir en `tareas_cache` → renderizar.
   - Offline: leer `tareas_cache` → renderizar. Mostrar badge offline en el header.
4. Mostrar advertencia de datos desactualizados si el timestamp de `tareas_cache` supera 24 h.

**Criterios de aceptación:**
- [ ] Abrir lista de tareas offline → se ven las tareas del último sync.
- [ ] Los puntos de ruta del mapa (`rutaPuntos`) se renderizan desde la caché.
- [ ] Badge offline visible; badge online desaparece.
- [ ] Al reconectar, la lista se refresca desde la API y la caché se actualiza.

---

#### T-2: Cambio de estado de tarea (`PATCH /operator/tasks/:id`)

**Flujo online:** Tocar "Iniciar" / "Completar" en la card → `PATCH /operator/tasks/:id`.

**Brecha offline:** Sin cola; la acción falla silenciosamente o muestra error.

**Implementación:**

1. Agregar store `tareas_pendientes` en `IndexedDbService` (clave: auto-increment, valor: `{ rutaId, estado, timestamp }`).
2. En `OperatorSyncService`, agregar `updateTaskState(rutaId, estado)`:
   - Online: `PATCH /operator/tasks/:rutaId` → actualizar entrada en `tareas_cache` localmente.
   - Offline: escribir en `tareas_pendientes` → actualizar `tareas_cache` de forma optimista.
3. En `syncPendingData()`, después de vaciar lecturas y anomalías: vaciar `tareas_pendientes` → `PATCH` cada una, luego eliminar de la cola.
4. Si el flush devuelve 409 (conflicto/transición inválida): loguear y descartar — NO reintentar.

**Criterios de aceptación:**
- [ ] Tocar "Completar" offline → la tarea refleja el nuevo estado de inmediato.
- [ ] Al reconectar, el estado se sincroniza con el servidor automáticamente.
- [ ] Conflicto (servidor ya en estado terminal) → entrada descartada, estado local refrescado en el próximo sync completo.

---

#### T-3: Lista de novedades (`/app/operador/novedades`)

**Flujo online:** `GET /operator/readings/anomalies` → render de cards en `novedades.component.ts`.

**Brecha offline:** El componente chequea `networkService.isOnline()`; si está offline muestra un banner y para. No se muestran datos cacheados.

**Implementación:**

1. Agregar store `novedades_cache` en `IndexedDbService` (clave: `lecturaId`, valor: `ReadingWithAnomaly`).
2. En `syncCatalogAndReadings()`: `GET /operator/readings/anomalies` → escribir todos los resultados en `novedades_cache`.
3. En `novedades.component.ts` método `loadAnomalies()`:
   - Online: fetch API → escribir en `novedades_cache` → renderizar.
   - Offline: leer `novedades_cache` → renderizar. Agregar anomalías pendientes de `anomalias_pendientes` que no estén en caché (match por `medidorId`). Mostrar badge offline.
4. Estrategia de merge para ítems pendientes: agregar al inicio de la lista con `estado: 'PENDIENTE'` y `lecturaId: null` — renderizar con chip "Pendiente de sync".

**Criterios de aceptación:**
- [ ] Offline → se ve la lista de novedades del último sync.
- [ ] Anomalías enviadas offline (en `anomalias_pendientes`) aparecen arriba con indicador pendiente.
- [ ] Al reconectar, la lista se refresca y los ítems pendientes se resuelven.

---

#### T-4: Formulario de novedades — resolución de `lecturaId` offline (`/app/operador/novedades/new`)

**Flujo online:** Al crear una anomalía sin `lecturaId` previo, el formulario llama a `GET /operator/readings?medidorId=X` para obtener la lectura más reciente y extraer su `lecturaId`. Luego `submitAnomaly({ lecturaId, ... })`.

**Brecha offline:** La llamada HTTP para resolver `lecturaId` falla → el formulario no puede enviar.

**Implementación:**

1. En `novedades-form.component.ts` método `getLatestReadingId(medidorId)`:
   - Online: usar la llamada HTTP actual.
   - Offline: consultar `lecturas_registradas` en IDB filtrado por `medidorId` → ordenar por `fecha` desc → devolver el primer `lecturaId`. Si no hay ninguno, devolver `null` (la anomalía se vinculará en el servidor al hacer flush).
2. En `OperatorSyncService.submitAnomaly()`, cuando `lecturaId` es `null` y está offline:
   - Guardar como `{ medidorId, tipo, observacion, foto?, lecturaId: null }` en `anomalias_pendientes`.
3. En `syncPendingData()`, para cada anomalía en cola con `lecturaId: null`:
   - Llamar `GET /operator/readings?medidorId=X&limit=1` para resolver `lecturaId`.
   - Luego `POST /reading-anomalies`.
   - Si no se encuentra la lectura, omitir y dejar en cola para el próximo intento.

**Criterios de aceptación:**
- [ ] Enviar anomalía offline sin `lecturaId` → encolada con `medidorId` como clave de respaldo.
- [ ] Al reconectar, `lecturaId` se resuelve automáticamente antes de postear.
- [ ] El formulario muestra "Guardado offline" en vez de un error.

---

#### T-5: Edición de novedades — actualización optimista de caché

**Flujo online:** Botón editar → navegar a `/novedades/new?lecturaId=X&medidorId=Y&tipo=Z&observacion=W` → formulario se pre-carga desde query params.

**Brecha offline (parcial):** El pre-cargado funciona porque usa query params. El problema es que al guardar offline y volver a la lista, el ítem editado sigue mostrando los valores viejos hasta el próximo sync.

**Implementación:**

1. Después de `submitAnomaly` exitoso (online): actualizar la entrada correspondiente en `novedades_cache` con los nuevos valores.
2. Después de `submitAnomaly` encolado (offline): actualizar la entrada correspondiente en `novedades_cache` de forma optimista con el nuevo `tipo`/`observacion`.
3. Cuando el flush de sync tiene éxito para una edición de anomalía: marcar la entrada en `novedades_cache` como confirmada (quitar el indicador "Pendiente de sync").

**Criterios de aceptación:**
- [ ] Editar anomalía offline → la card en la lista refleja los nuevos valores de inmediato.
- [ ] Al reconectar, el indicador pendiente desaparece.

---

## Orden de implementación

Dependencias:
- T-3 necesita el store `novedades_cache`.
- T-4 usa `lecturas_registradas` que ya existe.
- T-1 y T-2 comparten el store `tareas_cache`.

Orden sugerido:

1. **Agregar stores faltantes** (`tareas_cache`, `novedades_cache`, `tareas_pendientes`) — un solo cambio en `IndexedDbService`.
2. **T-1** — caché de lista de tareas (flujo de solo lectura, el más simple).
3. **T-3** — caché de lista de novedades (lectura + merge de pendientes).
4. **T-4** — resolución offline de `lecturaId` (más crítica para integridad de datos).
5. **T-2** — cola de cambio de estado de tarea.
6. **T-5** — actualización optimista de caché al editar (pulido final).

---

## Referencia de patrones

Todos los writes a IDB siguen este patrón de `OperatorSyncService`:

```ts
// guardar en IDB
await this.idb.put('tareas_cache', task.rutaId, task);

// leer todo desde IDB
const tasks = await this.idb.getAll<TaskResponse>('tareas_cache');

// eliminar de la cola tras sync exitoso
await this.idb.delete('tareas_pendientes', pendingItem.id);
```

Patrón de bifurcación online/offline (igual al usado en `submitReading`/`submitAnomaly`):

```ts
if (this.networkService.isOnline()) {
  // llamada HTTP
} else {
  await this.idb.put('tareas_pendientes', Date.now(), { rutaId, estado });
  // actualización local optimista
}
```
