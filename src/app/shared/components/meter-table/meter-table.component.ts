import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeter } from '../../../features/contracts/meters/domain/models/meter.model';
import { PaginationComponent } from '../pagination/pagination.component';
import { TableSkeletonComponent } from '../table-skeleton/table-skeleton.component';

@Component({
  selector: 'app-meter-table',
  standalone: true,
  imports: [CommonModule, PaginationComponent, TableSkeletonComponent],
  templateUrl: './meter-table.component.html',
  styleUrl: './meter-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterTableComponent {
  // Inputs
  readonly meters = input<IMeter[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly selectionMode = input<boolean>(false);
  readonly selectedMeterId = input<string | number | null>(null);
  readonly totalItems = input<number>(0);
  readonly currentPage = input<number>(1);
  readonly pageSize = input<number>(5);
  readonly pageSizeOptions = input<number[]>([5, 10, 20]);
  readonly showPagination = input<boolean>(true);
  readonly compact = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron medidores disponibles.');

  // Outputs
  readonly meterSelected = output<IMeter>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly editRequested = output<IMeter>();
  readonly statusChangeRequested = output<{ meter: IMeter; newStatus: string }>();

  isSelected(meter: IMeter): boolean {
    const current = this.selectedMeterId();
    if (!current) return false;
    return String(current) === String(meter.medidorId);
  }

  getStatusCode(meter: IMeter): string {
    if (!meter.estado) return 'BODEGA';
    if (typeof meter.estado === 'string') return meter.estado;
    return meter.estado.codigo || 'BODEGA';
  }

  getStatusLabel(meter: IMeter): string {
    if (!meter.estado) return 'Bodega';
    if (typeof meter.estado === 'string') {
      if (meter.estado === 'BODEGA') return 'Bodega';
      if (meter.estado === 'INSTALADO') return 'Instalado';
      if (meter.estado === 'DANADO') return 'Dañado';
      return meter.estado;
    }
    return meter.estado.nombre || meter.estado.codigo || 'Bodega';
  }

  select(meter: IMeter): void {
    this.meterSelected.emit(meter);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }
}
