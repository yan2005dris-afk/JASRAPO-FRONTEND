# Especificación de Diseño y Arquitectura de Producto (Design.md)

## Sistema Móvil para Operadores de Agua Potable y Alcantarillado (JAS / EPM)

**Versión:** 1.0.0  
**Fecha de referencia:** Septiembre 2026  
**Enfoque:** Operaciones de Campo, Ergonomía Industrial y Arquitectura Offline-First  

---

## 1. Visión del Producto y Contexto Operativo

### 1.1 Propósito
La aplicación está diseñada para operadores y técnicos de campo de juntas de agua potable y empresas de saneamiento (caso de estudio: **JAS RAPO / Sector Olón**). Sus funciones troncales son:

1. **Toma de lecturas de consumos ($m^3$)** en rutas predefinidas.
2. **Ejecución y certificación de Órdenes de Trabajo (OT):** cortes por mora, reconexiones, inspecciones.
3. **Reporte de novedades técnicas y comerciales** en tiempo real o diferido: fugas, conexiones clandestinas, medidores dañados.
4. **Sincronización robusta Offline-First** con resolución de conflictos y gestión de colas de paquetes y medios pesados (fotografías y firmas).

### 1.2 Restricciones Ambientales y de Hardware
- **Condiciones lumínicas:** Operación bajo luz solar directa en campo abierto costero. Requiere contraste alto ($WCAG\ AAA$), fuentes legibles y delimitaciones claras.
- **Conectividad inestable o nula:** Pérdida frecuente de cobertura 4G/LTE; el operador debe poder ejecutar su jornada completa en modo 100% desconectado.
- **Ergonomía:** Uso preferencial con una sola mano (zona de alcance del pulgar) y elementos táctiles mínimos de $48 \times 48\,\text{dp}$ aptos para manos enguantadas o húmedas.

---

## 2. Sistema de Diseño (Design Tokens)

### 2.1 Paleta de Color

```scss
// Superficies & Fondos
--bg-app:             #E1F5F5; // Cian/Aqua muy claro, baja fatiga visual
--bg-surface:         #FFFFFF; // Tarjetas y contenedores elevados
--bg-header-dark:     #0D282A; // Verde petróleo profundo / Dark Teal
--bg-accent-card:     #0F2D30; // Contenedor oscuro de ruta activa

// Colores de Marca & Acentos Primarios
--brand-primary:      #0A9396; // Teal corporativo / Botones principales
--brand-primary-dark: #005F73; // Prensado / Bordes
--brand-pill-active:  #00E5FF; // Cian brillante / Tags de estado en tarjeta oscura

// Estados Semánticos y Alertas
--status-success-bg:  #E8F5E9; // Consumo normal / checklist aprobado
--status-success:     #1E7E34; // Iconos y textos de confirmación
--status-warning-bg:  #FFF3E0; // Pendiente / Advertencias leves
--status-warning:     #D97706; // Naranja ámbar
--status-danger-bg:   #FCE8E6; // Conflicto / Severidad crítica
--status-danger:      #B91C1C; // Rojo oscuro de alta visibilidad
--status-badge-urgent:#FEE2E2; // Rosa pastel para badges de urgencia

// Tipografía y Neutros
--text-primary:       #0A191B; // Negro grafito de alto contraste
--text-secondary:     #4B6366; // Gris azulado para subtítulos y metadatos
--text-disabled:      #94A3B8; // Gris tenue para slots vacíos
--border-subtle:      #D1E7E8; // Líneas divisorias y cards en reposo
```

### 2.2 Tipografía
- **Familia Primaria:** Inter, Plus Jakarta Sans o Roboto.
- **Escala Modular:**
  - **Display Numbers:** $32\,\text{px} - 36\,\text{px}$ / Bold (ej. Lecturas: 78/150, Valor Input: 1,456).
  - **Header H1:** $20\,\text{px} - 22\,\text{px}$ / SemiBold (Títulos de vista).
  - **Header H2 / Card Titles:** $16\,\text{px} - 17\,\text{px}$ / Bold.
  - **Body / Data Field:** $14\,\text{px}$ / Medium.
  - **Caption / Metadatos:** $11\,\text{px} - 12\,\text{px}$ / Regular.

### 2.3 Radios y Elevaciones
- **Card Corner Radius:** 16px para tarjetas principales, 12px para subcomponentes internos, 8px para inputs y botones compactos.
- **Bordes:** 1px sólido `--border-subtle` en superficies blancas para asegurar definición sin depender de sombras en exteriores.
- **Sombras:** Elevaciones bajas y suaves (`box-shadow: 0 2px 8px rgba(13, 40, 42, 0.06)`).

---

## 3. Arquitectura de Información y Navegación

### 3.1 Barra de Navegación Inferior (Bottom Navigation)
Persistente en las vistas de primer nivel con altura de $64\,\text{dp}$:
1. **Inicio (`/dashboard` o `/rutas`):** Resumen general, estado offline, KPIs del turno y botón reanudar.
2. **Rutas (`/rutas`):** Catastro secuencial de medidores, ingreso de lectura, visualización en mapa.
3. **Órdenes (`/lecturas` - Dispatcher OT):** Cuadrilla técnica (cortes, reconexiones, inspecciones) con checklist legal y firma.
4. **Novedades (`/novedades`):** Levantamiento georreferenciado de anomalías físicas o comerciales.
5. **Sincronizar (`/sincronizar`):** Centro de control del motor transaccional, cola de envíos y resolución de conflictos con badge de pendientes.

---

## 4. Especificación Detallada de Pantallas

### Pantalla 1: Panel del Operador (Dashboard Principal)
- **Barra de Operador (Header):**
  - Avatar circular del operador.
  - Identificador: Nombre (Carlos M.), Rol (Operador), Sector territorial (Olón).
  - Chip de Estado de Conexión:
    - Sin conexión: Fondo blanco con borde, indicador ámbar (`● Modo Offline: 14 pendientes`).
    - Conectado: Indicador verde (`● Conectado: Sincronizado`).
- **Grilla de KPIs (2×2):**
  - *Lecturas Hoy:* Número grande (78/150), indicador de avance.
  - *Órdenes Asignadas:* Valor numérico (4), Tag de prioridad (2 urgentes).
  - *Novedades Reportadas:* Valor numérico (6), Tag de gravedad (1 crítica).
  - *Batería / Local:* Estado del dispositivo (OK), Badge técnico (82% · Almacenamiento libre).
- **Card de Ruta Activa (Featured Hero Card):**
  - Contenedor de contraste alto en fondo `--bg-accent-card`.
  - Tag superior: `RUTA ACTIVA · Sector Olón Norte · Mz 12`.
  - Título: `Continuar Ruta Activa: Manzana 12 — 42 pendientes`.
  - Barra de progreso horizontal de lectura continua.
  - Acciones: Botón principal *Reanudar Lecturas* (Play) y secundario *Mapa*.

### Pantalla 2: Rutas y Toma de Lecturas
- **Header & Búsqueda:**
  - Breadcrumb: `SECTOR OLÓN NORTE · MZ 12`.
  - Botón Vista Mapa / Lista.
  - Input de búsqueda global (medidor, código o cliente) con lector QR.
- **Filtros Segmentados:**
  - Chips con contador interactivo: `Pendientes`, `Leídos`, `Anomalía`.
- **Lista de Secuencia de Visita:**
  - Número de secuencia (#1, #2, #3), Medidor, Dirección y estado.
- **Módulo Modal / Bottom-Sheet de Registro de Lectura:**
  - Encabezado Teal con datos clave (`SEC #4 - MED-08414 · 1,438 m³ ant.`).
  - Input Numérico grande con sufijo `m³`.
  - Motor de validación de consumo en tiempo real ($\Delta = \text{Actual} - \text{Anterior}$).
  - Bloque de evidencia fotográfica con estampa de agua legal (hora + coordenadas GPS).
  - Soporte para desborde de cuadrante (*roll-over* de medidor).

### Pantalla 3: Órdenes de Trabajo (Técnica & Legal)
- **Tabs de Estado de OT:** `Para Hoy` | `En Progreso` | `Completadas`.
- **Cards de Órdenes de Trabajo:** Nivel de urgencia, código (OT-1042), tipo de trabajo (Corte por Mora, Reconexión, Inspección por Fuga).
- **Flujo de Ejecución en Campo (Checklist & Protocolo Legal):**
  - (1) Verificación de sellos.
  - (2) Foto antes.
  - (3) Lectura de corte / reconexión y precintado.
  - (4) Foto después.
  - (5) Firma digital del cliente o constancia de notificación si el abonado está ausente.

### Pantalla 4: Reporte de Novedades (Incidencias Técnicas)
- **Selector de Categoría:** Medidor Dañado, Fuga en Matriz, Conexión Clandestina, Predio Inaccesible, Medidor Invertido.
- **Vinculación Catastral & GPS:** Autocompletado de contratos cercanos y precisión satelital.
- **Evidencia Fotográfica Multi-slot (1/3).**
- **Matriz de Severidad:** Baja | Media | Crítica.

### Pantalla 5: Centro de Sincronización y Resolución de Conflictos
- **Estado del Motor de Sincronización:** Indicador en vivo, último sync exitoso, botón *Sincronizar Todo Ahora*.
- **Métricas de la Cola Local:** Desglose JSON ligero vs. Blobs pesados de fotos.
- **Tarjeta de Resolución de Conflictos (Critical Path):** Comparativa explícita y arbitraje (*Client-Wins* con evidencia fotográfica / *Server-Wins* en pagos de último minuto).

---

## 5. Arquitectura Técnica de Sincronización (Offline-First)

```
[Captura en Campo]
       │
       ▼
 [Validación Local] ──(Falla validación)──► [Requiere Corrección]
       │
       ▼ (Pasa validación)
[IndexedDB / LocalStore] (Estado: PENDING_SYNC)
       │
       ├─────────────────────────────────┐
       ▼ (Conectividad OFF)              ▼ (Conectividad ON)
[Cola de Espera Local]            [Envío por Lotes HTTP]
       │                                 │
       ▼ (Reconexión de Red)             ├──► 200 OK ──► [Estado: SYNCED]
[Disparo Sync Background] ───────────────┤
                                         ├──► 409 Conflict ──► [Estado: CONFLICT_HOLD]
                                         │                          │
                                         │                          ▼
                                         │               [Intervención Manual UI]
                                         │
                                         └──► Error Red ──► [Backoff Exponencial]
```

### 5.1 Política de Resolución de Conflictos (Arbitraje)

| Tipo de Dato | Conflicto Posible | Regla Predeterminada | Acción Requerida |
| :--- | :--- | :--- | :--- |
| **Lectura de Medidor** | La oficina modificó el catastro mientras el operador estaba sin red. | **Prevalece Campo (Client-Wins con Foto)** | Si la lectura incluye evidencia fotográfica y GPS verificado, sobreescribe al servidor. |
| **Orden de Trabajo** | La orden fue cancelada en el sistema comercial (pago de último minuto). | **Server-Wins con Notificación** | Si no se ha cortado, se aborta la OT. Si ya se ejecutó el corte físico, se genera automáticamente una OT de reconexión urgente sin costo. |
| **Novedad** | Reporte duplicado de la misma fuga en menos de 2 horas. | **Merge Automático** | Se combinan las fotos de distintos operadores bajo un único ID de incidente matriz. |

---

## 6. Consideraciones de Usabilidad y Hardware

- **Compresión de Imágenes en el Dispositivo:** Redimensionamiento a $1920 \times 1080\,\text{px}$ a 80% calidad (WebP/JPEG, $\approx 350 - 450\,\text{KB}$).
- **Estampado Forense de Metadatos (Watermarking):** ID Medidor, Timestamp UTC, Coordenadas GPS y Margen de Error.
- **Modo Ahorro de Energía:** Activación de GPS por demanda en pantallas de lectura/novedad.
