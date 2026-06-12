import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ComunidadesService } from './services/comunidades.service';
import { Comunidad } from './models/comunidad.interface';
import { ComunidadFormComponent } from './comunidad-form/comunidad-form.component';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
}

@Component({
  selector: 'app-comunidades',
  imports: [CommonModule, ComunidadFormComponent],
  templateUrl: './comunidades.component.html',
  styleUrl: './comunidades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class ComunidadesComponent {
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastService = inject(ToastService);
  private readonly focusableSelectors =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Control del menú desplegable de acciones por fila
  openDropdownId: number | null = null;

  toggleDropdown(comunidadId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === comunidadId ? null : comunidadId;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  readonly comunidades = signal<Comunidad[]>([]);
  isLoading = false;
  isDetailLoading = false;
  isSaving = false;
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);
  readonly totalItems = signal(0);
  readonly totalPagesServer = signal(1);
  readonly pageSizeOptions = [5, 10, 15];

  readonly searchTerm = signal('');
  readonly showFormModal = signal(false);
  readonly showDetailModal = signal(false);
  readonly isEditMode = signal(false);
  readonly selectedCommunity = signal<Comunidad | null>(null);
  private editingCommunityId: number | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  readonly hasFetched = signal(false);

  readonly pagedComunidades = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.comunidades();
    }
    return this.comunidades().filter((comunidad) => {
      return (
        comunidad.codigo.toLowerCase().includes(term) ||
        comunidad.nombre.toLowerCase().includes(term)
      );
    });
  });

  get totalPages(): number {
    return this.totalPagesServer();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  buscarComunidades(): void {
    this.isLoading = true;

    this.comunidadesService.getAllComunidades(this.currentPage(), this.pageSize()).subscribe({
      next: (response) => {
        this.comunidades.set(response.data);
        this.totalItems.set(response.meta.total);
        this.totalPagesServer.set(response.meta.ultimaPagina);
        this.hasFetched.set(true);
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
    this.showFormModal.set(true);
    this.focusModalBySelector('[data-modal="community-form"]');
  }

  openEditModal(comunidad: Comunidad): void {
    this.saveFocusedElement();
    this.isEditMode.set(true);
    this.editingCommunityId = comunidad.id;
    this.selectedCommunity.set(comunidad);
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
    this.restoreFocus();
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCommunity.set(null);
    this.restoreFocus();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.buscarComunidades();
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

    this.currentPage.set(page);
    this.buscarComunidades();
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
    this.isSaving = true;

    if (this.isEditMode()) {
      const id = this.editingCommunityId;

      if (id == null) {
        this.isSaving = false;
        return;
      }

      this.comunidadesService.updateComunidad(id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.refreshComunidadesAfterSave();
          this.closeFormModal();
          this.toastService.success('Comunidad actualizada correctamente', 'Éxito');
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isSaving = false;

          const mensajeError = this.obtenerMensajeErrorBackend(
            err,
            'No se pudo actualizar la comunidad. Revise los datos ingresados.',
          );

          this.toastService.error(mensajeError, 'Error');
          this.cdr.markForCheck();
        },
      });

      return;
    }

    this.comunidadesService.createComunidad(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.refreshComunidadesAfterSave();
        this.closeFormModal();
        this.toastService.success('Comunidad creada correctamente', 'Éxito');
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;

        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'No se pudo crear la comunidad. Revise los datos ingresados.',
        );

        this.toastService.error(mensajeError, 'Error');
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

  private refreshComunidadesAfterSave(): void {
    this.isLoading = true;
    this.currentPage.set(1);

    this.comunidadesService.getAllComunidades(1, this.pageSize()).subscribe({
      next: (response) => {
        this.comunidades.set(response.data);
        this.totalItems.set(response.meta.total);
        this.totalPagesServer.set(response.meta.ultimaPagina);
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
