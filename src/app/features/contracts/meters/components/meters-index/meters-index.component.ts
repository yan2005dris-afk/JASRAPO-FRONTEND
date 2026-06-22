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
import { FormsModule } from '@angular/forms';
import { MetersFormComponent } from '../meters-form/meters-form.component';
import {
  IMeter,
  ICreateMeterPayload,
  IEditMeterStatusPayload,
  IMeterStatus,
  IMeterDto,
  IUpdateMeterStatusBody,
  IMeterKpis,
  MeterStatusFilter,
} from '../../interfaces/imeter.interface';
import { MetersService } from '../../services/meters.service';
import { finalize } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../../../shared/components/dropdown/dropdown.component';

@Component({
  selector: 'app-meters',
  imports: [
    CommonModule,
    FormsModule,
    MetersFormComponent,
    PaginationComponent,
    DropdownComponent,
  ],
  templateUrl: './meters-index.component.html',
  styleUrl: './meters-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class MetersIndexComponent implements OnInit {
  private readonly metersService = inject(MetersService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  // Estado de los datos
  meters: IMeter[] = [];
  statusCatalog: IMeterStatus[] = [];
  editingMeter: IMeter | null = null;
  statusFilter: MeterStatusFilter = 'todos';
  searchQuery = '';

  // Flags de control de flujo y UI
  isLoading = false;
  hasFetched = false;
  isSaving = false;
  errorMessage = '';
  modalErrorMessage = '';

  // Control de modales
  showModal = false;
  isEditMode = false;

  // Control de dropdown de fila
  openDropdownId: number | null = null;

  dropdownItems: DropdownItem[] = [
    { label: 'Borrar todo', action: 'deleteAll', isDanger: true, icon: 'bi bi-trash' },
    { label: 'Importar', action: 'import', icon: 'bi bi-download' },
  ];

  toggleDropdown(meterId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === meterId ? null : meterId;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  getBackendErrorMessage(err: HttpErrorResponse, defaultMessage: string): string {
    return err.error?.message || defaultMessage;
  }

  showMessage(mensaje: string, contexto: 'tabla' | 'modal' = 'tabla'): void {
    if (contexto === 'modal') {
      this.modalErrorMessage = mensaje;
    } else {
      this.errorMessage = mensaje;
    }
  }

  // Paginación server-side (Estilo clients.ts, no-signals)
  pageSizeOptions = signal([5, 10, 15]);
  pageSize = signal(5);
  currentPage = signal(1);
  totalItems = signal(0);
  readonly kpis = signal<IMeterKpis>({ enBodega: 0, instalados: 0, danados: 0, total: 0 });

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems() / this.pageSize()));
  }

  get pageNumbers(): number[] {
    const range = 2;
    const start = Math.max(1, this.currentPage() - range);
    const end = Math.min(this.totalPages, this.currentPage() + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get pagedMetersComponent(): IMeter[] {
    return this.meters;
  }

  ngOnInit(): void {
    this.loadStatuses();
  }

  loadStatuses(): void {
    this.metersService.getMeterStatuses().subscribe({
      next: (estados) => {
        this.statusCatalog = estados;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al cargar catálogo de estados:', err);
      },
    });
  }

  filterByStatus(): void {
    this.currentPage.set(1);
    this.loadMeters();
  }

  loadMeters(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    // Buscar el ID numérico del estado correspondiente al código del filtro
    const selectedStatus = this.statusCatalog.find((e) => e.codigo === this.statusFilter);
    const statusId = selectedStatus?.codigo;

    this.metersService
      .getMeters({
        page: this.currentPage(),
        limit: this.pageSize(),
        estado: statusId,
        search: this.searchQuery.trim() || undefined,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const rawMeters = response.data as IMeterDto[];
          this.meters = rawMeters.map((meterDto) => {
            const foundStatus = this.statusCatalog.find((e) => {
              if (typeof meterDto.estado === 'string') {
                return e.codigo === meterDto.estado;
              }
              return e.codigo === meterDto.estado?.codigo;
            });
            return {
              ...meterDto,
              estado: foundStatus || this.statusCatalog[0],
            } as IMeter;
          });

          const meta = response.meta;
          this.totalItems.set(meta.total);
          this.kpis.set(response.kpis);
          this.hasFetched = true;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error en la carga de datos:', err);
          const errorMsg = this.getBackendErrorMessage(
            err,
            'Error al cargar la información de medidores',
          );
          this.showMessage(errorMsg, 'tabla');
        },
      });
  }

  // Métodos de navegación de página
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadMeters();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
      this.loadMeters();
    }
  }

  searchMeters(): void {
    this.currentPage.set(1);
    this.loadMeters();
  }

  handleMassAction(action: string) {
    console.log('Acción masiva seleccionada:', action);
    // TODO: Implementar lógica de la acción seleccionada
  }

  // Gestión de modales
  openRegister(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.editingMeter = null;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.editingMeter = null;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  openEdit(meter: IMeter): void {
    this.editingMeter = meter;
    this.isEditMode = true;
    this.showModal = true;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  saveMeter(newMeter: ICreateMeterPayload): void {
    this.isSaving = true;
    this.metersService.createMeter(newMeter).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.toastService.success('Medidor registrado correctamente', 'Éxito');
        this.loadMeters();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const errorMsg = this.getBackendErrorMessage(
          err,
          'Error al guardar el medidor. Revise los datos ingresados.',
        );
        this.toastService.error(errorMsg, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  updateMeterStatus(payload: IEditMeterStatusPayload): void {
    this.isSaving = true;
    this.cdr.detectChanges();
    const id = payload.medidorId;
    const body: IUpdateMeterStatusBody = {
      estado: payload.estado,
      motivo: payload.motivo,
    };
    this.metersService.updateMeter(id, body).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.toastService.success('Estado del medidor actualizado correctamente', 'Éxito');
        this.loadMeters();
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        const errorMsg = this.getBackendErrorMessage(
          err,
          'Error al actualizar: Verifique los datos enviados.',
        );
        this.toastService.error(errorMsg, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  deleteMeter(meter: IMeter): void {
    const id = meter.medidorId;
    this.dialogService
      .confirm({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el medidor "${meter.serie}"? Esta acción no se puede deshacer.`,
        isDanger: true,
        confirmText: 'Eliminar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.cdr.markForCheck();
          this.metersService.deleteMeter(id).subscribe({
            next: () => {
              this.toastService.success('Medidor eliminado correctamente', 'Éxito');
              this.loadMeters();
            },
            error: (err: HttpErrorResponse) => {
              this.isLoading = false;
              const errorMsg = this.getBackendErrorMessage(err, 'Error al eliminar el medidor.');
              this.toastService.error(errorMsg, 'Error');
              this.cdr.detectChanges();
            },
          });
        }
      });
  }

  // KPIs desde el backend
  get warehouseMeters(): number {
    return this.kpis().enBodega;
  }
  get installedMeters(): number {
    return this.kpis().instalados;
  }
  get damagedMeters(): number {
    return this.kpis().danados;
  }

  // Funciones de UI
  getStatusName(meter: IMeter): string {
    return meter.estado?.nombre || 'Sin estado';
  }

  getStatusBadgeClass(codigo: string | undefined): string {
    const badgeClasses: Record<string, string> = {
      BODEGA: 'text-bg-success',
      INSTALADO: 'text-bg-primary',
      DANADO: 'text-bg-danger',
      PENDIENTE: 'text-bg-warning text-dark',
      BAJA: 'text-bg-secondary',
    };
    return badgeClasses[codigo || ''] || 'text-bg-secondary';
  }

  getStatusIcon(codigo: string | undefined): string {
    if (!codigo) return '';
    const icons: Record<string, string> = {
      DANADO: 'bi-exclamation-triangle',
      BAJA: 'bi-x-lg',
      INSTALADO: 'bi-check-lg',
      BODEGA: 'bi-box-seam',
      PENDIENTE: 'bi-hourglass-split',
    };
    return icons[codigo] || '';
  }
}
