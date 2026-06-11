import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { EditarMedidorComponent } from './components/editar-medidor/editar-medidor.component';
import { RegistrarMedidorComponent } from './components/registrar-medidor/registrar-medidor.component';
import {
  IMedidor,
  CrearMedidorPayload,
  EditarEstadoMedidorPayload,
  IEstadoMedidor,
  IMedidorDto,
  ActualizarEstadoMedidorBody,
} from './interfaces/imedidor.interface';
import { MedidoresService } from './services/medidores.service';
import { forkJoin, finalize } from 'rxjs';

/**
 * Componente Principal de Gestión de Medidores
 * Controla la lógica de negocio, integración con servicios y el estado de la UI para el inventario.
 */
@Component({
  selector: 'app-medidores',
  imports: [CommonModule, RegistrarMedidorComponent, EditarMedidorComponent],
  templateUrl: './medidores.html',
  styleUrl: './medidores.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
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
  modalErrorMessage = '';

  // Control de modales
  showRegistrarModal = false;
  showEditarModal = false;

  // Control de dropdown de fila
  openDropdownId: number | null = null;

  toggleDropdown(medidorId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === medidorId ? null : medidorId;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  /**
   * Extrae el mensaje dinámico del backend o usa un fallback.
   */
  obtenerMensajeErrorBackend(err: HttpErrorResponse, mensajePorDefecto: string): string {
    return err.error?.message || mensajePorDefecto;
  }

  /**
   * Asigna el mensaje de error para mostrarlo en la interfaz.
   */
  mostrarMensaje(mensaje: string, contexto: 'tabla' | 'modal' = 'tabla'): void {
    if (contexto === 'modal') {
      this.modalErrorMessage = mensaje;
    } else {
      this.errorMessage = mensaje;
    }
  }

  // Configuración de paginación
  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  ngOnInit(): void {
    this.cargarMedidores();
  }

  /**
   * Obtiene la lista de medidores y estados desde el servicio en paralelo usando RxJS,
   * normaliza los datos y maneja la limpieza de fechas inválidas.
   */
  cargarMedidores(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      estados: this.medidoresService.getEstadosMedidor(),
      medidores: this.medidoresService.getMedidores(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ estados, medidores }) => {
          this.estadosCatalogo = estados;
          const medidoresCrudos = medidores as unknown as IMedidorDto[];
          this.medidores = medidoresCrudos.map((medidorDto) => {
            const estadoEncontrado = this.estadosCatalogo.find((e) => {
              if (typeof medidorDto.estado === 'string') {
                return e.codigo === medidorDto.estado;
              }
              return e.codigo === medidorDto.estado?.codigo;
            });
            return {
              ...medidorDto,
              estado: estadoEncontrado || this.estadosCatalogo[0],
            } as IMedidor;
          });

          this.hasFetched = true;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error en la carga de datos:', err);
          const mensajeError = this.obtenerMensajeErrorBackend(
            err,
            'Error al cargar la información de medidores o estados',
          );
          this.mostrarMensaje(mensajeError, 'tabla');
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
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  closeRegistrar(): void {
    this.showRegistrarModal = false;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  openEditar(medidor: IMedidor): void {
    this.editingMedidor = medidor;
    this.showEditarModal = true;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  closeEditar(): void {
    this.showEditarModal = false;
    this.editingMedidor = null;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  /**
   * TODO: Implementar navegación con Router a detalles del contrato cuando el módulo exista.
   */
  /*
  verContrato(medidor: IMedidor): void {
    if (medidor.contratoId) {
      console.log('Redirigiendo al contrato:', medidor.contratoId);
    }
  }
  */

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
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'Error al guardar el medidor. Revise los datos ingresados.',
        );
        this.mostrarMensaje(mensajeError, 'modal');
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Procesa la actualización de estado u observaciones de un medidor existente
   */
  actualizarMedidor(payload: EditarEstadoMedidorPayload): void {
    this.isSaving = true;
    this.cdr.detectChanges();
    const id = payload.medidorId;
    const body: ActualizarEstadoMedidorBody = {
      estadoId: payload.estadoId,
      motivo: payload.motivo,
    };

    // 3. Llamamos al servicio con los parámetros separados
    this.medidoresService.updateMedidor(id, body).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeEditar();
        this.cargarMedidores();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'Error al actualizar: Verifique los datos enviados.',
        );
        this.mostrarMensaje(mensajeError, 'modal');
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Ejecuta la eliminación de un registro tras confirmación del usuario
   */
  eliminarMedidor(medidor: IMedidor): void {
    const id = medidor.medidorId;
    if (confirm(`¿Estás seguro de eliminar el medidor ${medidor.serie}?`)) {
      this.isLoading = true;
      this.cdr.markForCheck();
      this.medidoresService.deleteMedidor(id).subscribe({
        next: () => {
          this.cargarMedidores();
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          const mensajeError = this.obtenerMensajeErrorBackend(
            err,
            'Error al eliminar el medidor.',
          );
          this.mostrarMensaje(mensajeError, 'tabla');
          this.cdr.detectChanges();
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
