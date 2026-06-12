import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectoresFormComponent } from '../sectores-form.component/sectores-form.component';
import { AuthService } from '../../../../../core/services/auth.service';
import { SectoresService } from '../../services/sectores';
import { Sectores } from '../../models/sectores.interface';
import {
  DropdownComponent,
  DropdownItem,
} from '../../../../../shared/components/dropdown/dropdown.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Comunidad } from '../../../comunidades/models/comunidad.interface';
import { ComunidadesService } from '../../../comunidades/services/comunidades.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-sectores-prueba',
  imports: [
    CommonModule,
    SectoresFormComponent,
    DropdownComponent,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './sectores-prueba.html',
  styleUrl: './sectores-prueba.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class SectoresPrueba implements OnInit {
  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);

  private sectoresService = inject(SectoresService);
  private comunidadesService = inject(ComunidadesService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  /** Control del menú desplegable de acciones por fila */
  openDropdownId: number | null = null;

  toggleDropdown(sectorId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === sectorId ? null : sectorId;
    this.cdr.markForCheck();
  }

  closeDropdowns(): void {
    if (this.openDropdownId !== null) {
      this.openDropdownId = null;
      this.cdr.markForCheck();
    }
  }

  /** Lista de sectores que se muestra en la tabla. Empieza vacía. */
  sectores: Sectores[] = [];
  comunidadDelSectorMapeada: Record<number, string> = {};

  ngOnInit() {
    this.mapearComunidadConSector();
  }

  objetoSectorAEditar: Sectores | null = null;

  communitySelectedToView: Comunidad | null = null;

  /** Indica si se está realizando una petición a la API. */
  isLoading = false;

  /** Indica si ya se ha realizado al menos una búsqueda (sea exitosa o no). */
  hasFetched = false;

  /** Items para el dropdown de acciones masivas */
  dropdownItems: DropdownItem[] = [
    { label: 'Borrar todo', action: 'deleteAll', isDanger: true, icon: 'bi bi-trash' },
    { label: 'Importar', action: 'import', icon: 'bi bi-download' },
  ];

  /** Estado del modal */
  modalMode: 'create' | 'edit' | 'view' | 'none' = 'none';

  abrirModal() {
    this.modalMode = 'create';
    this.objetoSectorAEditar = null; // Limpiar para modo agregar
    this.cdr.markForCheck();
  }

  cerrarModal() {
    this.modalMode = 'none';
    this.objetoSectorAEditar = null; // Limpiar al cerrar
    this.cdr.markForCheck();
  }

  editarSector(sector: Sectores) {
    this.objetoSectorAEditar = sector;
    this.modalMode = 'edit';
    this.cdr.markForCheck();
  }

  verDetalleSector(sector: Sectores) {
    this.objetoSectorAEditar = sector;
    this.communitySelectedToView = null; // Limpiar datos anteriores
    this.modalMode = 'view';
    this.cdr.markForCheck();

    // Obtener la comunidad completa por su ID
    if (sector.comunidadId) {
      this.comunidadesService.getComunidadById(sector.comunidadId).subscribe({
        next: (comunidad) => {
          this.communitySelectedToView = comunidad;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al obtener la comunidad:', err);
        },
      });
    }
  }

  /**
   * Obtiene la lista de todas las comunidades y las transforma en un diccionario (Mapa).
   * Esto permite buscar el nombre de la comunidad a partir de su ID de forma instantánea
   * en la tabla HTML, evitando iterar arreglos (O(1) vs O(N)) por cada fila renderizada.
   */
  mapearComunidadConSector() {
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (response) => {
        this.comunidadDelSectorMapeada = response.data.reduce(
          (acc, obj) => {
            acc[obj.id] = obj.nombre;
            return acc;
          },
          {} as Record<number, string>,
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar comunidades para el mapeo:', err);
      },
    });
  }

  // Pagination
  readonly pageSizeOptions = [5, 10, 15];
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);
  readonly totalItems = signal(0);
  readonly totalPagesServer = signal(1);

  get totalPages(): number {
    return this.totalPagesServer();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedSectores(): Sectores[] {
    return this.sectores;
  }

  // -------------------------------------------------------------------------
  // Métodos
  // -------------------------------------------------------------------------
  mostrarSectores(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.sectoresService.getAllSectores(this.currentPage(), this.pageSize()).subscribe({
      next: (response) => {
        this.sectores = response.data;
        this.totalItems.set(response.meta.total);
        this.totalPagesServer.set(response.meta.ultimaPagina);
        this.hasFetched = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al obtener sectores:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.mostrarSectores();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPagesServer()) {
      this.currentPage.set(page);
      this.mostrarSectores();
    }
  }

  handleAccionMasiva(action: string) {
    console.log('Acción masiva seleccionada:', action);
    // TODO: Implementar lógica de la acción seleccionada
  }

  eliminarSector(sector: Sectores) {
    const { sectorId } = sector;
    if (sectorId == null) {
      this.toastService.error('No se puede eliminar un sector sin sectorId.', 'Error');
      return;
    }

    this.dialogService
      .confirm({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar el sector "${sector.nombre}"? Esta acción no se puede deshacer.`,
        isDanger: true,
        confirmText: 'Eliminar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading = true;
          this.cdr.markForCheck();
          this.sectoresService.deleteSector(sectorId).subscribe({
            next: () => {
              this.toastService.success('Sector eliminado correctamente', 'Éxito');
              this.mostrarSectores();
            },
            error: (err) => {
              console.error('Error eliminando sector:', err);
              const msg = err.error?.message || 'Ocurrió un error al eliminar el sector.';
              this.toastService.error(msg, 'Error');
              this.isLoading = false;
              this.cdr.markForCheck();
            },
          });
        }
      });
  }
}
