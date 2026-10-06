import { Page, Locator, expect } from '@playwright/test';

/** Base page object with the app shell helpers shared by all authenticated pages. */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navega a un path arbitrario dentro de la app. Usa el `baseURL` configurado.
   */
  async gotoPath(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
  }

  /** Navega a `path` o, si no se pasa, a `/login`. Atajo para los POMs. */
  async goto(path: string = '/login'): Promise<void> {
    await this.gotoPath(path);
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
    // both contain "contraseña" (resolves to 2 elements).
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

/** Page object for the clientes list (listado de clientes). */
export class ClientesListPage extends BasePage {
  readonly addButton: Locator;

  constructor(page: Page) {
    super(page);
    // El test crudo usa 'Agregar'; usamos regex para tolerar variantes
    // ("Agregar", "Agregar cliente", "Agregar Cliente") sin tocar el POM.
    this.addButton = page.getByRole('button', { name: /^Agregar( cliente)?$/i });
  }

  /** Navega al listado de clientes. La ruta real es `/app/Contratos/Cliente`. */
  async goto(): Promise<void> {
    await this.gotoPath('/app/Contratos/Cliente');
  }

  /** Abre el formulario de alta de cliente. Espera a que el form esté listo. */
  async openNewClientForm(): Promise<void> {
    await this.addButton.click();
    await expect(this.page.getByLabel('Tipo de identificación *')).toBeVisible();
  }
}

/** Page object for the cliente form (alta / edición). */
export class ClienteFormPage extends BasePage {
  readonly tipoIdentificacion: Locator;
  readonly numeroIdentificacion: Locator;
  readonly nombres: Locator;
  readonly apellidos: Locator;
  readonly fechaNacimiento: Locator;
  readonly direccion: Locator;
  readonly correo: Locator;
  readonly telefonoPrincipal: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tipoIdentificacion = page.getByLabel('Tipo de identificación *');
    this.numeroIdentificacion = page.getByLabel('Número de identificación *');
    this.nombres = page.getByLabel('Nombres *');
    this.apellidos = page.getByLabel('Apellidos *');
    this.fechaNacimiento = page.getByLabel('Fecha de nacimiento');
    this.direccion = page.getByLabel('Dirección domiciliaria *');
    this.correo = page.getByLabel('Correo electrónico *');
    this.telefonoPrincipal = page.getByLabel('Teléfono principal *');
    // El botón dice "Registrar Cliente" (con espacio) en el template actual.
    // Aceptamos también variantes tolerantes a futuro.
    this.submitButton = page.getByRole('button', { name: /Registrar Cliente/i });
  }

  /** Completa los campos visibles del formulario y hace submit. */
  async fillAndSubmit(data: ClienteFormData): Promise<void> {
    await this.tipoIdentificacion.selectOption('2'); // 2 = CÉDULA
    await this.numeroIdentificacion.fill(data.identificacion);
    await this.nombres.fill(data.nombres);
    await this.apellidos.fill(data.apellidos);
    await this.direccion.fill(data.direccion);
    await this.correo.fill(data.correo);
    await this.telefonoPrincipal.fill(data.telefono);
    await this.submitButton.click();
  }

  /**
   * Selecciona una fecha en el datepicker Material.
   * Asume clicks del flujo crudo: abre picker → mes → año → 2x "años
   * anteriores" → mes → día.
   */
  async selectFechaNacimiento(opts: { year: number; month: string; day: string }): Promise<void> {
    await this.fechaNacimiento.click();
    await this.page.getByRole('button', { name: opts.month }).click();
    await this.page.getByRole('button', { name: String(opts.year) }).click();
    // Doble click en "Años anteriores" para retroceder 2 décadas.
    await this.page.getByTitle('Años anteriores').click();
    await this.page.getByTitle('Años anteriores').click();
    await this.page.getByRole('button', { name: opts.month }).click();
    await this.page.getByRole('button', { name: opts.day, exact: true }).click();
  }
}

export interface ClienteFormData {
  identificacion: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: { year: number; month: string; day: string };
  direccion: string;
  correo: string;
  telefono: string;
}
