import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
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
  MeterKpis,
} from './interfaces/imedidor.interface';
import { MedidoresService } from './services/medidores.service';
import { forkJoin, finalize } from 'rxjs';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

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
  private readonly medidoresService = inject(MedidoresService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

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

  obtenerMensajeErrorBackend(err: HttpErrorResponse, mensajePorDefecto: string): string {
    return err.error?.message || mensajePorDefecto;
  }

  mostrarMensaje(mensaje: string, contexto: 'tabla' | 'modal' = 'tabla'): void {
    if (contexto === 'modal') {
      this.modalErrorMessage = mensaje;
    } else {
      this.errorMessage = mensaje;
    }
  }

  // Paginación server-side
  readonly pageSizeOptions = [5, 10, 15];
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);
  readonly totalItems = signal(0);
  readonly totalPagesServer = signal(1);
  readonly kpis = signal<MeterKpis>({ enBodega: 0, instalados: 0, danados: 0, total: 0 });

  get totalPages(): number {
    return this.totalPagesServer();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedMedidores(): IMedidor[] {
    return this.medidores;
  }

  ngOnInit(): void {
    this.cargarMedidores();
  }

  cargarMedidores(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      estados: this.medidoresService.getEstadosMedidor(),
      response: this.medidoresService.getMedidores(this.currentPage(), this.pageSize()),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ estados, response }) => {
          this.estadosCatalogo = estados;
          const medidoresCrudos = response.data as IMedidorDto[];
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

          const meta = response.meta;
          this.totalItems.set(meta.total);
          this.totalPagesServer.set(meta.ultimaPagina);
          this.kpis.set(response.kpis);
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

  // Métodos de navegación de página
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.cargarMedidores();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
      this.cargarMedidores();
    }
  }

  // Gestión de modales
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

  guardarMedidor(nuevoMedidor: CrearMedidorPayload): void {
    this.isSaving = true;
    this.medidoresService.createMedidor(nuevoMedidor).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeRegistrar();
        this.toastService.success('Medidor registrado correctamente', 'Éxito');
        this.cargarMedidores();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'Error al guardar el medidor. Revise los datos ingresados.',
        );
        this.toastService.error(mensajeError, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  actualizarMedidor(payload: EditarEstadoMedidorPayload): void {
    this.isSaving = true;
    this.cdr.detectChanges();
    const id = payload.medidorId;
    const body: ActualizarEstadoMedidorBody = {
      estadoId: payload.estadoId,
      motivo: payload.motivo,
    };

    this.medidoresService.updateMedidor(id, body).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeEditar();
        this.toastService.success('Estado del medidor actualizado correctamente', 'Éxito');
        this.cargarMedidores();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const mensajeError = this.obtenerMensajeErrorBackend(
          err,
          'Error al actualizar: Verifique los datos enviados.',
        );
        this.toastService.error(mensajeError, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  eliminarMedidor(medidor: IMedidor): void {
    const id = medidor.medidorId;
    this.dialogService
      .confirm({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el medidor "${medidor.serie}"? Esta acción no se puede deshacer.`,
        isDanger: true,
        confirmText: 'Eliminar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.cdr.markForCheck();
          this.medidoresService.deleteMedidor(id).subscribe({
            next: () => {
              this.toastService.success('Medidor eliminado correctamente', 'Éxito');
              this.cargarMedidores();
            },
            error: (err: HttpErrorResponse) => {
              this.isLoading = false;
              const mensajeError = this.obtenerMensajeErrorBackend(
                err,
                'Error al eliminar el medidor.',
              );
              this.toastService.error(mensajeError, 'Error');
              this.cdr.detectChanges();
            },
          });
        }
      });
  }

  // KPIs desde el backend
  get medidoresEnBodega(): number {
    return this.kpis().enBodega;
  }
  get medidoresInstalados(): number {
    return this.kpis().instalados;
  }
  get medidoresDanados(): number {
    return this.kpis().danados;
  }

  // Funciones de UI
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
