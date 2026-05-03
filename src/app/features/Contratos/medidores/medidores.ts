import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditarMedidorComponent } from './components/editar-medidor/editar-medidor.component';
import { RegistrarMedidorComponent } from './components/registrar-medidor/registrar-medidor.component';
import {
  IMedidor,
  CrearMedidorPayload,
  EditarEstadoMedidorPayload,
  EstadoMedidor,
} from './interfaces/imedidor.interface';
import { MedidoresService } from './services/medidores.service';
import { map } from 'rxjs/operators';

/**
 * Componente Principal de Gestión de Medidores
 * Controla la lógica de negocio, integración con servicios y el estado de la UI para el inventario.
 */
@Component({
  selector: 'app-medidores',
  standalone: true,
  imports: [CommonModule, RegistrarMedidorComponent, EditarMedidorComponent],
  templateUrl: './medidores.html',
  styleUrl: './medidores.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Medidores implements OnInit {
  // Inyección de servicios y utilidades
  private readonly medidoresService = inject(MedidoresService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Estado de los datos
  medidores: IMedidor[] = [];
  editingMedidor: IMedidor | null = null;

  // Flags de control de flujo y UI
  isLoading = false;
  hasFetched = false;
  isSaving = false;
  errorMessage = '';

  // Control de modales
  showRegistrarModal = false;
  showEditarModal = false;

  // Configuración de paginación
  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  ngOnInit(): void {
    this.cargarMedidores();
  }

  /**
   * Obtiene la lista de medidores desde el servicio, normaliza los datos
   * y maneja la limpieza de fechas inválidas provenientes del backend.
   */
  cargarMedidores(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.medidoresService
      .getMedidores()
      .pipe(
        map((data) =>
          data.map((m) => {
            // Eliminamos toda la lógica de fechaCreacionValida
            return {
              ...m,
              estado: m.estado?.toUpperCase() as EstadoMedidor,
            };
          }),
        ),
      )
      .subscribe({
        next: (data) => {
          this.medidores = data;
          this.hasFetched = true;
          this.isLoading = false;
          this.currentPage = 1;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.hasFetched = true;
          this.errorMessage = 'Error al cargar los datos';
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Getters para el filtrado y cálculo de paginación
   */
  get filteredMedidores(): IMedidor[] {
    return this.medidores;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMedidores.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedMedidores(): IMedidor[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredMedidores.slice(start, start + this.pageSize);
  }

  /**
   * Métodos de control de navegación de la tabla
   */
  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  /**
   * Gestión de apertura y cierre de modales
   */
  openRegistrar(): void {
    this.showRegistrarModal = true;
    this.editingMedidor = null;
    this.cdr.markForCheck();
  }

  closeRegistrar(): void {
    this.showRegistrarModal = false;
    this.cdr.markForCheck();
  }

  openEditar(medidor: IMedidor): void {
    this.editingMedidor = medidor;
    this.showEditarModal = true;
    this.cdr.markForCheck();
  }

  closeEditar(): void {
    this.showEditarModal = false;
    this.editingMedidor = null;
    this.cdr.markForCheck();
  }

  /**
   * Redirección o visualización de detalles del contrato asociado
   */
  verContrato(medidor: IMedidor): void {
    if (medidor.contratoId) {
      console.log('Redirigiendo al contrato:', medidor.contratoId);
    }
  }

  /**
   * Procesa el registro de un nuevo medidor y refresca la lista
   */
  guardarMedidor(nuevoMedidor: CrearMedidorPayload): void {
    this.isSaving = true;
    this.medidoresService.createMedidor(nuevoMedidor).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeRegistrar();
        this.cargarMedidores();
      },
      error: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Procesa la actualización de estado u observaciones de un medidor existente
   */
  actualizarMedidor(payload: EditarEstadoMedidorPayload): void {
    this.isSaving = true;
    this.cdr.markForCheck();

    const id = Number(payload.medidor.medidorId);
    const changes: Partial<IMedidor> = { estado: payload.estado };

    if (payload.motivo) {
      changes.motivo = payload.motivo;
    }

    this.medidoresService.updateMedidor(id, changes).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeEditar();
        this.cargarMedidores();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Error al actualizar el estado';
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Ejecuta la eliminación de un registro tras confirmación del usuario
   */
  eliminarMedidor(medidor: IMedidor): void {
    const id = Number(medidor.medidorId);

    if (confirm(`¿Estás seguro de eliminar el medidor ${medidor.serie}?`)) {
      this.isLoading = true;
      this.cdr.markForCheck();

      this.medidoresService.deleteMedidor(id).subscribe({
        next: () => {
          this.cargarMedidores();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Error al eliminar el medidor';
          this.cdr.markForCheck();
        },
      });
    }
  }

  /**
   * Getters para el cálculo de indicadores (KPIs) de cabecera
   */
  get medidoresEnBodega(): number {
    return this.medidores.filter((m) => m.estado === 'BODEGA').length;
  }
  get medidoresInstalados(): number {
    return this.medidores.filter((m) => m.estado === 'INSTALADO').length;
  }
  get medidoresDanados(): number {
    return this.medidores.filter((m) => m.estado === 'DANADO').length;
  }

  /**
   * Funciones de transformación de UI para visualización de estados
   */
  getEstadoNombre(estado: string): string {
    const nombres: Record<string, string> = {
      BODEGA: 'Disponible',
      INSTALADO: 'Instalado',
      DANADO: 'Dañado',
      BAJA: 'Obsoleto',
    };
    return nombres[estado?.toUpperCase()] || estado;
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      INSTALADO: 'badge-instalado',
      BODEGA: 'badge-disponible',
      DANADO: 'badge-danado',
      BAJA: 'badge-obsoleto',
    };
    return clases[estado?.toUpperCase()] || 'badge-secondary';
  }

  getEstadoIcon(estado: string): string {
    const iconos: Record<string, string> = {
      DANADO: 'bi-exclamation-triangle',
      BAJA: 'bi-x-lg',
    };
    return iconos[estado?.toUpperCase()] || '';
  }
}
