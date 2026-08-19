# PENDIENTES-COBRO

Pendientes identificados durante el rediseño del modal "Registrar Pago" como pantalla de cobro por cliente (layout inspirado en el diseño Visily "Punto de Recaudación").

1. **Bloqueo real de cobro por datos SRI incompletos**: NO implementado en backend. Requiere validación de datos de facturación (email/dirección/RUC) y posible política de negocio. Pendiente.
2. **Emisión de factura electrónica / comprobante SRI desde el cobro** (botón "Emitir Factura" del diseño): pendiente, requiere integración SRI en backend.
3. **Recibo provisorio / recibo de pago imprimible**: evaluar su alcance.
4. **Sugerencia "CONSUMIDOR FINAL"**: implementada como sugerencia visual de frontend (toggle que limpia la alerta y muestra el badge de facturación). La validación real de datos SRI queda pendiente.
5. **Convenio de pago desde el cobro** (botón "Request Agreement"): navega a la ruta real `ConveniosDePago` del módulo agreements (`/app/Contratos/ConveniosDePago`). Validar redirección según roles/menú.
6. **Nota de transacción cifrada + IP + ID terminal**: pendiente, no hay datos expuestos por el backend.
7. **Diseño Visily usa sidebar viejo y "Cheque" como método de pago**: alinear con la estructura real de menús y los métodos de pago del backend (EFECTIVO/TRANSFERENCIA/TARJETA) cuando se rediseñe el sidebar.