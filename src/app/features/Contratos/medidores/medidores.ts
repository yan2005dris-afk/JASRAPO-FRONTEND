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
  IEstadoMedidor,
} from './interfaces/imedidor.interface';
import { MedidoresService } from './services/medidores.service';

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
  estadosCatalogo: IEstadoMedidor[] = [];
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

    this.medidoresService.getEstadosMedidor().subscribe({
      next: (estados) => {
        this.estadosCatalogo = estados;

        this.medidoresService.getMedidores().subscribe({
          next: (data) => {
            this.medidores = data.map((medidor) => {
              // Buscamos el objeto en el catálogo comparando el valor recibido
              const estadoEncontrado = this.estadosCatalogo.find(
                (e) => e.codigo === (medidor.estado as unknown as string),
              );

              return {
                ...medidor,
                estado: estadoEncontrado || this.estadosCatalogo[0],
              };
            });

            this.hasFetched = true;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isLoading = false;
            this.errorMessage = 'Error al cargar medidores';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.errorMessage = 'Error al cargar catálogo de estados';
        this.isLoading = false;
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
    this.cdr.detectChanges();

    const id = Number(payload.medidorId);

    const body = {
      estadoId: payload.estadoId,
      motivo: payload.motivo || '',
      marca: this.editingMedidor?.marca,
      modelo: this.editingMedidor?.modelo,
      serie: this.editingMedidor?.serie,
    };

    this.medidoresService.updateMedidor(id, body).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeEditar();
        this.cargarMedidores();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'Error al actualizar: Verifique los datos enviados';
        this.cdr.detectChanges();
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
    return this.medidores.filter((m) => m.estado?.codigo === 'BODEGA').length;
  }
  get medidoresInstalados(): number {
    return this.medidores.filter((m) => m.estado?.codigo === 'INSTALADO').length;
  }
  get medidoresDanados(): number {
    return this.medidores.filter((m) => m.estado?.codigo === 'DANADO').length;
  }

  /**
   * Funciones de transformación de UI para visualización de estados
   */
  getEstadoNombre(medidor: IMedidor): string {
    return medidor.estado?.nombre || 'Sin estado';
  }

  getEstadoBadgeClass(codigo: string | undefined): string {
    const clases: Record<string, string> = {
      BODEGA: 'badge-disponible',
      INSTALADO: 'badge-instalado',
      DANADO: 'badge-danado',
      PENDIENTE: 'badge-warning',
      BAJA: 'badge-obsoleto',
    };
    return clases[codigo || ''] || 'badge-secondary';
  }

  getEstadoIcon(codigo: string | undefined): string {
    if (!codigo) return '';
    const iconos: Record<string, string> = {
      DANADO: 'bi-exclamation-triangle',
      BAJA: 'bi-x-lg',
      INSTALADO: 'bi-check-lg',
      BODEGA: 'bi-box-seam',
      PENDIENTE: 'bi-hourglass-split',
    };
    return iconos[codigo] || '';
  }
}
