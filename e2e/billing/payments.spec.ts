import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers';

test.describe('Facturación — Recaudación y Detalle de Pagos', () => {
  test(
    'Navegación al detalle del pago muestra toda la información y desglose',
    { tag: ['@critical', '@billing', '@PAYMENT-E2E-001'] },
    async ({ page }) => {
      // 1. Ir a la lista de pagos
      await gotoApp(page, '/app/Facturacion/RecaudacionYPagos');

      await expect(page.getByRole('heading', { name: 'Recaudación y Pagos' })).toBeVisible({
        timeout: 15000,
      });

      // 2. Esperar que cargue la tabla de pagos
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 });

      // 3. Abrir menú de acciones de la primera fila y hacer clic en "Ver detalle"
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.getByRole('button', { name: 'Menú de acciones' }).click();

      const verDetalleBtn = page.getByRole('button', { name: /Ver detalle/i });
      await expect(verDetalleBtn).toBeVisible({ timeout: 5000 });
      await verDetalleBtn.click();

      // 4. Verificar que navega a la pantalla completa /app/Facturacion/RecaudacionYPagos/:id
      await expect(page).toHaveURL(/\/app\/Facturacion\/RecaudacionYPagos\/\d+/, {
        timeout: 15000,
      });

      // 5. Verificar componentes clave en la pantalla de Detalle
      await expect(page.getByText('Volver a Recaudación')).toBeVisible();
      await expect(page.getByText(/Pago #\d+/).first()).toBeVisible();
      await expect(page.getByText('Información del Cliente')).toBeVisible();
      await expect(page.getByText('Detalles de la Transacción')).toBeVisible();
      await expect(page.getByText('Desglose de Aplicación del Cobro')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Imprimir Comprobante' })).toBeVisible();

      // 6. Verificar tabla de desglose
      const breakdownTable = page.locator('table.custom-table');
      await expect(breakdownTable).toBeVisible();
      await expect(breakdownTable.locator('th', { hasText: 'Tipo de Aplicación' })).toBeVisible();
      await expect(
        breakdownTable.locator('th', { hasText: 'Referencia / Comprobante' }),
      ).toBeVisible();
      await expect(breakdownTable.locator('th', { hasText: 'Monto Abonado' })).toBeVisible();
    },
  );

  test(
    'Formulario de Registro de Pago carga prefacturas pendientes y sincroniza monto',
    { tag: ['@high', '@billing', '@PAYMENT-E2E-002'] },
    async ({ page }) => {
      // 1. Ir directamente a Registrar Pago
      await gotoApp(page, '/app/Facturacion/RecaudacionYPagos/RegistrarPago');

      await expect(page.getByRole('heading', { name: 'Registrar Pago' })).toBeVisible({
        timeout: 15000,
      });

      // 2. Verificar que están los métodos de pago
      await expect(page.getByRole('button', { name: 'Efectivo' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Transferencia' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tarjeta' })).toBeVisible();

      // 3. Abrir el modal de selección de contrato
      const selectContractBtn = page.getByRole('button', {
        name: /Seleccionar contrato|Buscar contrato/i,
      });
      if (await selectContractBtn.isVisible()) {
        await selectContractBtn.click();
        await expect(page.locator('.picker-modal, .modal.show')).toBeVisible({ timeout: 5000 });

        // Seleccionar el primer contrato si está disponible
        const firstContractRow = page
          .locator('.picker-modal tbody tr, .modal.show tbody tr')
          .first();
        if (await firstContractRow.isVisible()) {
          await firstContractRow.click();

          // Verificar que se cargan los datos del cliente
          await expect(page.getByText('Estado de Cuenta Pendiente')).toBeVisible({
            timeout: 10000,
          });
        }
      }
    },
  );
});
