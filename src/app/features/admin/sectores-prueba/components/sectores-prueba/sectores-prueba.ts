import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
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
  styleUrl: './sectores-prueba.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectoresPrueba {
  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);

  private sectoresService = inject(SectoresService);

  /** Lista de sectores que se muestra en la tabla. Empieza vacía. */
  sectores: Sectores[] = [];

  objetoSectorAEditar: Sectores | null = null;
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
  isModalOpen = false;

  abrirModal() {
    this.isModalOpen = true;
    this.objetoSectorAEditar = null; // Limpiar para modo agregar
    this.cdr.markForCheck();
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.objetoSectorAEditar = null; // Limpiar al cerrar
    this.cdr.markForCheck();
  }

  get filteredSectores(): Sectores[] {
    return this.sectores;
  }

  // Pagination
  pageSizeOptions = [5, 10, 15];
  pageSize = 5;
  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSectores.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedSectores(): Sectores[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSectores.slice(start, start + this.pageSize);
  }

  // -------------------------------------------------------------------------
  // Métodos
  // -------------------------------------------------------------------------
  /**
   * Simula un fetch a una API usando un array estático.
   * Se llama únicamente desde el botón "Buscar" en el template.
   *
   * Patrón a seguir en otros módulos:
   *   1. Marcar isLoading = true.
   *   2. Llamar al servicio (o simular con setTimeout).
   *   3. Asignar el resultado a la propiedad del componente.
   *   4. Marcar hasFetched = true para que la tabla sea visible.
   *   5. Marcar isLoading = false.
   */
  mostrarSectores(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.sectoresService.getAllSectores().subscribe({
      next: (data) => {
        // console.log(data);

        this.sectores = data;
        this.hasFetched = true;
        this.isLoading = false;
        this.currentPage = 1;
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
    this.pageSize = size;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  handleAccionMasiva(action: string) {
    console.log('Acción masiva seleccionada:', action);
    // TODO: Implementar lógica de la acción seleccionada
  }

  editarSector(sector: Sectores) {
    this.objetoSectorAEditar = sector;
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  eliminarSector(sector: Sectores) {
    const { sectorId } = sector;
    if (sectorId == null) {
      console.error('No se puede eliminar un sector sin sectorId:', sector);
      return;
    }
    if (confirm(`¿Eliminar sector ${sector.nombre}?`)) {
      this.sectoresService.deleteSector(sectorId).subscribe(() => this.mostrarSectores());
    }
  }
}
