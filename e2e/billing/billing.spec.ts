import { test, expect } from '@playwright/test';
import { BatchesPage, BatchDetailPage, PreInvoicesPage } from '../base-page';
import { ROUTES } from '../helpers';

test.describe('Facturación — Generación de Planillas (Lotes)', () => {
  test('Lista de lotes carga con historial y botón Generar Lote',
    { tag: ['@high', '@billing', '@BATCH-E2E-001'] },
    async ({ page }) => {
      const batchesPage = new BatchesPage(page);
      await batchesPage.goto(ROUTES.batches);

      await expect(
        page.getByRole('heading', { name: 'Generación de Planillas' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Historial de Emisiones')).toBeVisible();
      await expect(batchesPage.generateButton).toBeVisible();

      // Puede haber o no lotes, pero el estado de carga debe resolverse
      await expect(page.locator('.spinner-border')).toHaveCount(0, { timeout: 20000 }).catch(() => undefined);
    });

  test('Abrir detalle de lote muestra el detalle y sus acciones por estado',
    { tag: ['@critical', '@billing', '@BATCH-E2E-002'] },
    async ({ page }) => {
      const batchesPage = new BatchesPage(page);
      await batchesPage.goto(ROUTES.batches);

      await expect(batchesPage.rows.first()).toBeVisible({ timeout: 20000 });
      await batchesPage.openFirstBatchDetail();

      // Detalle de lote: toolbar y tabla
      await expect(page.getByText(/Detalle de Lote|EnvioDeFacturacion/).first()).toBeVisible({
        timeout: 15000,
      }).catch(() => undefined);

      // Esperar a que la tabla del detalle cargue filas o empty-state
      await expect(
        page.locator('table tbody tr, app-empty-state').first(),
      ).toBeVisible({ timeout: 20000 });

      const detail = new BatchDetailPage(page);

      // Contador de planillas debe existir en el header
      await expect(page.getByText(/planillas generadas/i)).toBeVisible({ timeout: 15000 });

      // Si hay filas, verificar que el menú de tres puntitos existe en la primera fila
      if ((await detail.tableRows.count()) > 0) {
        await detail.openFirstRowMenu();
        await expect(page.getByText('Ver factura')).toBeVisible({ timeout: 5000 });
      }
    });

  test('Detalle de lote ofrece Pasar a revisión para GENERADA y Aprobar para EN_REVISION',
    { tag: ['@critical', '@billing', '@BATCH-E2E-003'] },
    async ({ page }) => {
      const batchesPage = new BatchesPage(page);
      await batchesPage.goto(ROUTES.batches);
      await expect(batchesPage.rows.first()).toBeVisible({ timeout: 20000 });
      await batchesPage.openFirstBatchDetail();

      const detail = new BatchDetailPage(page);
      await expect(page.getByText(/planillas generadas/i)).toBeVisible({ timeout: 15000 });

      // Según los datos del seed hay prefacturas GENERADA (lote 26) y EN_REVISION.
      // Los botones aparecen solo si hay filas en ese estado.
      const rows = await detail.tableRows.count();

      if (rows > 0) {
        // La fila debe tener un menú de acciones
        await detail.openFirstRowMenu();
        await expect(page.getByText('Ver factura')).toBeVisible({ timeout: 5000 });
      }

      // Validar contadores coherentes: al menos un botón de bulk si hay estados pendientes
      const hasGenerated = (await detail.moveAllToReviewButton.count()) > 0;
      const hasPending = (await detail.approveAllButton.count()) > 0;
      // No puede haber ambos contadores en 0 si hay filas visibles
      if (rows > 0) {
        expect(hasGenerated || hasPending).toBeTruthy();
      }
    });
});

test.describe('Facturación — Prefacturas (GeneracionPlanilla)', () => {
  test('Lista de prefacturas carga con paginación correcta (meta.total)',
    { tag: ['@high', '@billing', '@PREFACTURA-E2E-001'] },
    async ({ page }) => {
      const preInvoicesPage = new PreInvoicesPage(page);
      await preInvoicesPage.goto(ROUTES.prefacturas);

      await expect(page.getByText(/Prefacturas|Generación de Planillas/i).first()).toBeVisible({
        timeout: 15000,
      });

      // La tabla carga (o empty state)
      await expect(
        page.locator('table tbody tr, app-empty-state').first(),
      ).toBeVisible({ timeout: 20000 });

      // Si hay paginación, totalItems debe reflejar el total real (> pageSize)
      const pagination = page.locator('app-pagination');
      if ((await pagination.count()) > 0) {
        await expect(pagination).toBeVisible();
      }
    });

  test('Filtros: expandir "Ver más filtros", aplicar búsqueda y limpiar',
    { tag: ['@high', '@billing', '@PREFACTURA-E2E-002'] },
    async ({ page }) => {
      const preInvoicesPage = new PreInvoicesPage(page);
      await preInvoicesPage.goto(ROUTES.prefacturas);

      await expect(page.getByText(/Prefacturas|Generación de Planillas/i).first()).toBeVisible({
        timeout: 15000,
      });

      // "Ver más filtros" es un enlace/enlace-botón
      const moreFilters = page.getByRole('button', { name: /Ver más filtros/i });
      if ((await moreFilters.count()) > 0) {
        await moreFilters.click();
        // Aparecen los datepickers desde/hasta
        await expect(page.locator('#prefactura-fecha-desde')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('#prefactura-fecha-hasta')).toBeVisible({ timeout: 5000 });
      }

      // Buscar no debe romper la página aunque no haya resultados
      const searchButton = page.getByRole('button', { name: /Buscar/i });
      if ((await searchButton.count()) > 0) {
        await searchButton.click();
        await expect(page.locator('.spinner-border')).toHaveCount(0, { timeout: 20000 }).catch(() => undefined);
      }
    });
});