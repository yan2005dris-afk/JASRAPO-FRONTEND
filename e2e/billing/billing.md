### E2E Tests: Facturación (Lotes y Prefacturas)

**Suite ID:** `BILLING-E2E`
**Feature:** Facturación — generación de planillas

---

## Test Case: `BATCH-E2E-001` - Lista de lotes carga

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @billing

**Description/Objective:** La pantalla de Generación de Planillas lista los lotes.

**Preconditions:**
- Sesión admin activa

### Flow Steps:
1. Login
2. Ir a `/app/Facturacion/EnvioDeFacturacion`

### Expected Result:
- Header "Generación de Planillas", botón "Generar Lote", historial visible

---

## Test Case: `BATCH-E2E-002` - Abrir detalle de lote

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @billing

**Description/Objective:** Desde la lista se abre el detalle del lote con su tabla de prefacturas.

### Flow Steps:
1. Login
2. Ir a lista de lotes
3. Abrir menú de acciones del primer lote → "Ver detalle"

### Expected Result:
- Detalle con contador "planillas generadas", tabla con filas y menú "Ver factura"

---

## Test Case: `BATCH-E2E-003` - Acciones por estado en detalle de lote

**Priority:** `critical`

**Tags:**
- type → @e2e
- feature → @billing

**Description/Objective:** Verificar el flujo GENERADA → EN_REVISION → APROBADA en el detalle.

**Preconditions:**
- Lote con prefacturas GENERADA y/o EN_REVISION

### Flow Steps:
1. Login
2. Abrir detalle de lote
3. Verificar contadores y botones bulk según estados

### Expected Result:
- "Pasar a revisión" disponible cuando hay GENERADA; "Aprobar" cuando hay EN_REVISION

---

## Test Case: `PREFACTURA-E2E-001` - Lista de prefacturas con paginación

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @billing

**Description/Objective:** Verificar que la paginación usa el total real del backend.

**Preconditions:**
- Más de `pageSize` prefacturas

### Flow Steps:
1. Login
2. Ir a `/app/Facturacion/GeneracionPlanilla`

### Expected Result:
- Tabla cargada, componente de paginación presente

---

## Test Case: `PREFACTURA-E2E-002` - Filtros de búsqueda y fechas

**Priority:** `high`

**Tags:**
- type → @e2e
- feature → @billing

**Description/Objective:** Expandir "Ver más filtros" y aplicar búsqueda.

### Flow Steps:
1. Login
2. Ir a prefacturas
3. Clic en "Ver más filtros" → datepickers Desde/Hasta
4. Clic en Buscar

### Expected Result:
- Filtros visibles, búsqueda no rompe la página