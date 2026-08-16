### 1. Estructura Unificada de Menús y Submenús (Angular 17+ SPA)

Todo el sistema administrativo tendrá esta jerarquía principal en su barra lateral, diseñada para separar responsabilidades operativas, financieras y de configuración.

📁 1. GESTIÓN DE SUMINISTROS (CONTRATOS)

- Padrón de Clientes y Guías: Fusión de Cliente y Contrato. Permite gestionar datos personales y técnicos (N° Guía, Medidor, Sector, Categoría). Es el centro de control para el flag is_perfil_validado (datos_completos).
- Inventario de Medidores: Control de stock físico. Registro de ingresos (bodega) y bajas por daño.
- Planificación de Rutas: Panel donde Secretaría genera el "Plan del Día". Asigna medidores para Lectura, Corte o Reconexión a los operadores. (REVISAR)
- Bandeja de Auditoría: Revisión de lecturas y novedades subidas desde el móvil. Permite corregir errores antes de que se conviertan en facturas.

📁 2. FACTURACIÓN Y COBROS

- Punto de Recaudación (Ventanilla): Interfaz estrella.
  - Lazy Cleansing: Bloqueo de cobro con Modal automático si faltan datos SRI.
  - Pagos: Gestión de deudas de agua, multas y convenios en una sola transacción.
  - Mora: Aplicación de condonaciones (solo con autorización).

- Control de Caja Diaria: Apertura y cierre de turnos. Reporte de efectivo físico vs. sistema.
- Validación de Transferencias: Módulo para revisar vouchers de WhatsApp (MinIO) y confirmar el ingreso real en el banco. (REVISAR)
- Emisión Masiva y Monitor SRI: Lanzamiento del planillaje mensual y visor de estados de facturas electrónicas (Autorizadas/Rechazadas). (REVISAR)

📁 3. REPORTES Y FINANZAS

- Convenios de Pago: Registro y seguimiento de acuerdos de pago (Regla 50/50).
- Egresos y Notas de Crédito: Gestión de gastos operativos y anulación legal de facturas autorizadas (Botón Rojo).
- Cartera Vencida y Morosidad: Listados filtrables para toma de decisiones sobre cortes masivos.
- Exportación Contable (Excel): Generación de balances con el desglose del 5% de la Tasa de Olón.

📁 4. CONFIGURACIÓN Y SEGURIDAD

- Dashboard Gerencial: Gráficos de KPIs (Recaudación, consumo por sector, etc.).
- Parámetros y Tarifario: Configuración de costos por m3, intereses de mora y rubros fijos.
- Control de Staff: Gestión de cuentas de usuario del sistema (Roles y accesos).
- Auditoría (Log): Visor inmutable de acciones críticas para seguridad informática.

---

### 2. Matriz de Permisos (CRUD por Roles)

Esto es exactamente lo que debes poner en tu documento. Define quién puede hacer qué dentro de ese menú unificado.

_(Leyenda: L=Leer, C=Crear, A=Actualizar, E=Eliminar/Anular/Condonar, -=Sin Acceso)_

| Menu Principal   | Submenú / Pantalla              | Secretaria     | Tesorero | Contadora | Presidente      | Admin (Soporte) |
| ---------------- | ------------------------------- | -------------- | -------- | --------- | --------------- | --------------- |
| 1. Suministros   | **Usuarios y Suministros**      | L, C, A        | L        | L         | L               | L, C, A, E      |
|                  | **Inventario de Medidores**     | L, C, A        | -        | -         | L               | L, C, A, E      |
|                  | **Planificación Rutas**         | L, C, A        | -        | -         | L               | L, C, A, E      |
|                  | **Bandeja de Auditoria**        | L, A           | -        | -         | L               | L, C, A, E      |
| 2. Facturación   | **Punto de Recaudación**        | -              | L, C, A  | L         | L, E (Condonar) | L               |
|                  | **Caja Diaria**                 | -              | L, C, A  | L (T)     | L (T)           | L (T)           |
|                  | **Validación Transferencias**   | -              | -        | L, C, A   | L               | L, C, A, E      |
|                  | **Emisión y Monitor SRI**       | -              | -        | L         | L               | C, L (Trigger)  |
| 3. Reportes      | **Convenios de Pago**           | L, C (Prepara) | L        | L         | L, A (Aprueba)  | L, C, A, E      |
|                  | **Egresos y Notas Crédito**     | -              | -        | L, C, A   | L               | L, C, A, E      |
|                  | **Cartera Vencida y Morosidad** | L, C           | L        | L         | L               | L               |
|                  | **Historial Contable**          | L              | L        | L         | L               | L               |
| 4. Configuración | **Dashboard Gerencial**         | -              | -        | L         | L               | L               |
|                  | **Parámetros y Tarifario**      | -              | -        | -         | L, A            | L, A            |
|                  | **Control Usuarios (Staff)**    | -              | -        | -         | L               | L, C, A, E      |
|                  | **Auditoría (Log)**             | -              | -        | L         | L               | L               |

---

### 3. ¿Cómo se programa esto con tu Stack Tecnológico?

Demostrar que sabes cómo implementar esta matriz de seguridad y experiencia de usuario (UX) te dará muchos puntos en la defensa de tu proyecto:

1. Frontend (Angular 17+):
   - Lazy Cleansing Interceptor: Al consultar un cliente en el componente de cobro, si is_perfil_validado === false, el FormGroup de pago se deshabilita y se lanza un MatDialog (o similar) para la actualización obligatoria de datos.
   - Signals para Estado de Caja: Usa Angular Signals para mantener en tiempo real el estado de la caja (Abierta/Cerrada) en el Header de la aplicación.
2. Backend (NestJS + Prisma):
   - Middleware de Auditoría: Cada vez que se ejecute un método PATCH o DELETE en rutas críticas, un interceptor debe grabar en la tabla LogAuditoria el userId, la IP y el timestamp.
   - Transactions ($transaction): El proceso de cobro debe ser atómico. Se crea el Pago, se crean los DetallePago, se actualizan las EmisionesMensuales a 'PAGADA' y se emite la Factura en un solo bloque.
3. Móvil (Ionic PWA):
   - Service Worker: Configurarlo para que la aplicación funcione como una PWA instalable, permitiendo el acceso a la cámara mediante Capacitor.
   - IndexedDB con RxDB: Para manejar los datos offline de forma reactiva en el móvil.
4. Colas (BullMQ + Redis):
   - El envío al SRI es asíncrono. Cuando el Tesorero cobra, el sistema responde "Pago Exitoso" y encola la facturación electrónica para que el worker la procese en 2-3 segundos.

---

### 4. Estructura de Navegación Móvil (Bottom Tabs)

- 📥 Tab 1: Sync In (Bajar):
  - Botón para descargar la ruta asignada.
  - Indicador de "Última sincronización".
  - Limpia datos locales antiguos y prepara la jornada.
- 🛠️ Tab 2: Plan del Día (Operativo):
  - Lista de medidores con filtros: [Todos] [Lectura] [Corte/Reconexión].
  - Buscador manual de Guía.
  - Botón flotante "+" para reportar novedades fuera de ruta (fugas, robos).
  - Validación: El campo de lectura no permite guardar si Actual < Anterior.
- 📤 Tab 3: Sync Out (Subir):
  - Resumen del trabajo realizado.
  - Botón "Finalizar y Subir" que envía el lote de datos y fotos (MinIO) al servidor.

---

### 5. Matriz de Permisos Específica (Operador en Campo)

(Leyenda: L = Leer/Ver, C = Crear/Registrar, A = Actualizar/Editar localmente, - = Sin Acceso)

| Módulo Móvil (Ionic) | Submenú / Acción                   | Permisos del Operador | Lógica de Sincronización (Backend)                                                        |
| -------------------- | ---------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| 1. SYNC (bAJADA)     | **Descargar Rutas Asig**           | L                     | GET /rutas/hoy (Guarda en SQLite Local)                                                   |
| 2. Plan del Día      | **Visualizar Lista de Usuarios**   | L                     | Lista unificada. Muestra tarjetas diferenciadas visualmente                               |
|                      | **Registrar y Corregir Lectura**   | C / A                 | Guarda el consumo calculado localmente con estado PENDIENTE_SYNC.                         |
|                      | **Ejecutar Corte por Mora**        | A                     | Al confirmar el corte, el contrato cambia a estado SUSPENDIDO en la base local.           |
|                      | **Reportar Novedad (Redirección)** | C                     | Redirige a formulario con: Combobox (Estado), Descripción y Botón de Foto (Capacitor).    |
|                      | **Reconexión**                     | A                     | Al subir, el contrato vuelve a ACTIVO automáticamente.                                    |
| 3. Sync (Subida)     | **Panel de Resumen**               | L                     | Muestra listado de lo trabajado: Ej. "50 Lecturas registradas"                            |
|                      | **Subir Datos al Servidor**        | C / A                 | 'Se ejecuta POST /lecturas/batch. Bloquea la pantalla que muestra % de progreso de envío. |
