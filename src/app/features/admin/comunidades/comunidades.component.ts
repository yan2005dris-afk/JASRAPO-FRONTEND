import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComunidadesService } from './services/comunidades.service';
import { Comunidad } from './models/comunidad.interface';
import { ComunidadFormComponent } from './comunidad-form/comunidad-form.component';

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

  readonly comunidades = signal<Comunidad[]>([]);
  isLoading = false;
  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 15];

  readonly searchTerm = signal('');
  readonly showFormModal = signal(false);
  readonly showDetailModal = signal(false);
  readonly isEditMode = signal(false);
  readonly selectedCommunity = signal<Comunidad | null>(null);
  private editingCommunityId: number | null = null;
  readonly hasFetched = signal(false);
  formErrors: Record<string, string> = {};

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
    this.isEditMode.set(false);
    this.editingCommunityId = null;
    this.selectedCommunity.set(null);
    this.formErrors = {};
    this.showFormModal.set(true);
  }

  openEditModal(comunidad: Comunidad): void {
    this.isEditMode.set(true);
    this.editingCommunityId = comunidad.id;
    this.selectedCommunity.set(comunidad);
    this.formErrors = {};
    this.showFormModal.set(true);
  }

  openDetailModal(comunidad: Comunidad): void {
    this.isLoading = true;

    this.comunidadesService.getComunidadById(comunidad.id).subscribe({
      next: (detalle) => {
        this.selectedCommunity.set(detalle);
        this.showDetailModal.set(true);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error obteniendo detalle de comunidad:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingCommunityId = null;
    this.selectedCommunity.set(null);
    this.formErrors = {};
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCommunity.set(null);
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

  handleFormSubmit(payload: Omit<Comunidad, 'id'>): void {
    this.formErrors = {};

    if (this.isCodeDuplicate(payload.codigo, this.editingCommunityId)) {
      this.formErrors = { codigo: 'El código debe ser único.' };
      return;
    }

    if (this.isEditMode()) {
      const id = this.editingCommunityId;

      if (id == null) {
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

          this.cdr.markForCheck();
          this.refreshComunidadesAfterSave();
          this.closeFormModal();
        },
        error: (err) => {
          console.error('Error actualizando comunidad:', err);

          if (err.status === 403) {
            alert('No tiene permiso para editar comunidades.');
            return;
          }

          alert('Ocurrió un error al actualizar la comunidad.');
        },
      });

      return;
    }

    this.comunidadesService.createComunidad(payload).subscribe({
      next: (created) => {
        this.comunidades.set(this.sortComunidades([...this.comunidades(), created]));
        this.cdr.markForCheck();
        this.refreshComunidadesAfterSave();
        this.closeFormModal();
      },
      error: (err) => {
        console.error('Error creando comunidad:', err);
      },
    });
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error recargando comunidades después de guardar:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private isCodeDuplicate(codigo: string, editingId: number | null): boolean {
    const normalized = codigo.trim().toLowerCase();

    return this.comunidades().some((comunidad) => {
      const sameCode = comunidad.codigo.trim().toLowerCase() === normalized;
      const differentId = editingId == null || comunidad.id !== editingId;

      return sameCode && differentId;
    });
  }
}
