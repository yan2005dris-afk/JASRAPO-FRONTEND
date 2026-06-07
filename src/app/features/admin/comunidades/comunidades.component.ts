import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ComunidadesService } from './services/comunidades.service';
import { Comunidad } from './models/comunidad.interface';
import { ComunidadFormComponent } from './comunidad-form/comunidad-form.component';

interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
}

@Component({
  selector: 'app-comunidades',
  standalone: true,
  imports: [CommonModule, ComunidadFormComponent],
  templateUrl: './comunidades.component.html',
  styleUrl: './comunidades.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComunidadesComponent {
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly focusableSelectors =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  readonly comunidades = signal<Comunidad[]>([]);
  isLoading = false;
  isDetailLoading = false;
  isSaving = false;
  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 15];

  readonly searchTerm = signal('');
  readonly showFormModal = signal(false);
  readonly showDetailModal = signal(false);
  readonly isEditMode = signal(false);
  readonly selectedCommunity = signal<Comunidad | null>(null);
  private editingCommunityId: number | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  readonly hasFetched = signal(false);
  readonly mensajeNotificacion = signal<string | null>(null);
  readonly tipoNotificacion = signal<'success' | 'error'>('success');

  constructor() {
    effect(() => {
      this.searchTerm();
      this.currentPage = 1;
      this.cdr.markForCheck();
    });
  }

  readonly filteredComunidades = computed(() => {
    const term = this.searchTerm().toLowerCase();

    return this.comunidades().filter((comunidad) => {
      return (
        !term ||
        comunidad.codigo.toLowerCase().includes(term) ||
        comunidad.nombre.toLowerCase().includes(term)
      );
    });
  });

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredComunidades().length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get pagedComunidades(): Comunidad[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredComunidades().slice(start, start + this.pageSize);
  }

  private sortComunidades(items: Comunidad[]): Comunidad[] {
    return [...items].sort((a, b) => {
      const numericA = Number(a.codigo);
      const numericB = Number(b.codigo);

      if (!Number.isNaN(numericA) && !Number.isNaN(numericB)) {
        return numericA - numericB;
      }

      return a.codigo.localeCompare(b.codigo, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  buscarComunidades(): void {
    this.isLoading = true;

    this.comunidadesService.getAllComunidades().subscribe({
      next: (data) => {
        this.comunidades.set(this.sortComunidades(data));
        this.hasFetched.set(true);
        this.currentPage = 1;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[Comunidades] Error al cargar comunidades:', error);
        this.isLoading = false;
        this.hasFetched.set(true);
        this.cdr.markForCheck();
      },
    });
  }

  openCreateModal(): void {
    this.saveFocusedElement();
    this.isEditMode.set(false);
    this.editingCommunityId = null;
    this.selectedCommunity.set(null);
    this.limpiarMensaje();
    this.showFormModal.set(true);
    this.focusModalBySelector('[data-modal="community-form"]');
  }

  openEditModal(comunidad: Comunidad): void {
    this.saveFocusedElement();
    this.isEditMode.set(true);
    this.editingCommunityId = comunidad.id;
    this.selectedCommunity.set(comunidad);
    this.limpiarMensaje();
    this.showFormModal.set(true);
    this.focusModalBySelector('[data-modal="community-form"]');
  }

  openDetailModal(comunidad: Comunidad): void {
    this.saveFocusedElement();
    this.isDetailLoading = true;

    this.comunidadesService.getComunidadById(comunidad.id).subscribe({
      next: (detalle) => {
        this.selectedCommunity.set(detalle);
        this.showDetailModal.set(true);
        this.isDetailLoading = false;
        this.focusModalBySelector('[data-modal="community-detail"]');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error obteniendo detalle de comunidad:', err);
        this.isDetailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingCommunityId = null;
    this.selectedCommunity.set(null);
    this.limpiarMensaje();
    this.restoreFocus();
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCommunity.set(null);
    this.restoreFocus();
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;

    if (target?.value) {
      this.setPageSize(Number(target.value));
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.cdr.markForCheck();
  }

  trapModalFocus(event: KeyboardEvent, modal: HTMLElement): void {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getFocusableElements(modal);

    if (focusableElements.length === 0) {
      event.preventDefault();
      modal.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  handleFormSubmit(payload: Omit<Comunidad, 'id'>): void {
    this.limpiarMensaje();
    this.isSaving = true;

    if (this.isEditMode()) {
      const id = this.editingCommunityId;

      if (id == null) {
        this.isSaving = false;
        return;
      }

      this.comunidadesService.updateComunidad(id, payload).subscribe({
        next: (updated) => {
          this.comunidades.set(
            this.sortComunidades(
              this.comunidades().map((comunidad) =>
                comunidad.id === updated.id ? updated : comunidad,
              ),
            ),
          );

          this.isSaving = false;
          this.refreshComunidadesAfterSave();
          this.closeFormModal();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving = false;

          const mensajeError = this.obtenerMensajeErrorBackend(
            err,
            'No se pudo actualizar la comunidad. Revise los datos ingresados.',
          );

          this.mostrarMensaje(mensajeError, 'error');
          this.cdr.markForCheck();
        },
      });

      return;
    }

    this.comunidadesService.createComunidad(payload).subscribe({
      next: (created) => {
        this.comunidades.set(this.sortComunidades([...this.comunidades(), created]));
        this.isSaving = false;
        this.refreshComunidadesAfterSave();
        this.closeFormModal();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;

        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'No se pudo crear la comunidad. Revise los datos ingresados.',
        );

        this.mostrarMensaje(mensajeError, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private obtenerMensajeErrorBackend(err: HttpErrorResponse, mensajePorDefecto: string): string {
    const errorBackend = err.error as BackendErrorResponse | string | null;

    if (typeof errorBackend === 'string' && errorBackend.trim()) {
      return errorBackend;
    }

    if (!errorBackend || typeof errorBackend !== 'object') {
      return mensajePorDefecto;
    }

    if (errorBackend.message) {
      return errorBackend.message;
    }

    if (errorBackend.error) {
      return errorBackend.error;
    }

    if (Array.isArray(errorBackend.errors) && errorBackend.errors.length > 0) {
      return errorBackend.errors.join(' ');
    }

    if (errorBackend.errors && typeof errorBackend.errors === 'object') {
      const mensajes = Object.values(errorBackend.errors).flat();

      if (mensajes.length > 0) {
        return mensajes.join(' ');
      }
    }

    return mensajePorDefecto;
  }

  private mostrarMensaje(mensaje: string, tipo: 'error'): void {
    this.mensajeNotificacion.set(mensaje);
    this.tipoNotificacion.set(tipo);
  }

  private limpiarMensaje(): void {
    this.mensajeNotificacion.set(null);
  }

  private refreshComunidadesAfterSave(): void {
    this.isLoading = true;

    this.comunidadesService.getAllComunidades().subscribe({
      next: (items) => {
        this.comunidades.set(this.sortComunidades(items));
        this.currentPage = 1;
        this.hasFetched.set(true);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error recargando comunidades después de guardar:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private saveFocusedElement(): void {
    this.previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private focusModalBySelector(selector: string): void {
    setTimeout(() => {
      const modal = document.querySelector<HTMLElement>(selector);

      if (!modal) {
        return;
      }

      const firstFocusableElement = this.getFocusableElements(modal)[0];

      if (firstFocusableElement) {
        firstFocusableElement.focus();
        return;
      }

      modal.focus();
    });
  }

  private restoreFocus(): void {
    setTimeout(() => {
      this.previouslyFocusedElement?.focus();
      this.previouslyFocusedElement = null;
    });
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(this.focusableSelectors)).filter(
      (element) => !element.hasAttribute('disabled') && this.isVisible(element),
    );
  }

  private isVisible(element: HTMLElement): boolean {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }
}
