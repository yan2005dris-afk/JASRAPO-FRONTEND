import { Page, Locator, expect } from '@playwright/test';

/** Base page object with the app shell helpers shared by all authenticated pages. */
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
  }

  /** Expect the page header H3/H4 to contain the given title. */
  async expectHeader(title: string): Promise<void> {
    await expect(this.page.locator('h3, h4').first()).toContainText(title, { timeout: 15000 });
  }

  /** Current URL without origin. */
  get currentPath(): string {
    return this.page.url().replace(/^https?:\/\/[^/]+/, '');
  }

  /** Open the user dropdown in the header and click "Cerrar Sesión". */
  async logout(): Promise<void> {
    await this.page
      .locator('header, .navbar, app-header')
      .first()
      .getByRole('button')
      .last()
      .click();
    await this.page.getByRole('button', { name: /Cerrar Sesión/i }).click();
    await expect(this.page).toHaveURL(/\/login/, { timeout: 15000 });
  }
}

/** Page object for the login screen. */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    // Use id-based selectors (instead of getByLabel) to avoid strict-mode
    // collisions with the password-toggle button whose aria-label and title
    // both contain "contraseña" (resolved to 2 elements).
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: 'Ingresar al Sistema' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

/** Page object for the batches list (Generación de Planillas). */
export class BatchesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get generateButton() {
    return this.page.getByRole('button', { name: 'Generar Lote' });
  }

  get refreshButton() {
    return this.page.getByRole('button', { name: 'Actualizar' });
  }

  get rows() {
    return this.page.locator('table tbody tr');
  }

  /** Open the row menu for the first batch and click "Ver detalle". */
  async openFirstBatchDetail(): Promise<void> {
    await this.rows.first().getByRole('button', { name: 'Menú de acciones' }).click();
    await this.page.getByRole('button', { name: 'Ver detalle' }).click();
  }
}

/** Page object for the batch detail (EnvioDeFacturacion/:id). */
export class BatchDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get tableRows() {
    return this.page.locator('table tbody tr');
  }

  get moveAllToReviewButton() {
    return this.page.getByRole('button', { name: /Pasar Todas a Revisión/i });
  }

  get moveSelectedToReviewButton() {
    return this.page.getByRole('button', { name: /Pasar a revisión \(\d+\)/i });
  }

  get approveAllButton() {
    return this.page.getByRole('button', { name: /Aprobar Todas/i });
  }

  get approveSelectedButton() {
    return this.page.getByRole('button', { name: /Aprobar Seleccionadas/i });
  }

  /** Open the three-dot menu of the first row. */
  async openFirstRowMenu(): Promise<void> {
    await this.tableRows.first().getByRole('button').last().click();
  }
}

/** Page object for the prefacturas list (GeneracionPlanilla). */
export class PreInvoicesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get rows() {
    return this.page.locator('table tbody tr');
  }

  get searchInput() {
    return this.page.getByPlaceholder(/Buscar|Cédula|RUC/i).first();
  }

  get moreFiltersLink() {
    return this.page.getByRole('button', { name: /Ver más filtros/i });
  }

  get searchButton() {
    return this.page.getByRole('button', { name: /Buscar/i });
  }

  get clearButton() {
    return this.page.getByRole('button', { name: /Limpiar/i });
  }

  get nextPageButton() {
    return this.page.getByRole('button', { name: /Siguiente|next/i });
  }
}
