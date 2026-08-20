import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

export interface IReadingRowItem {
  lecturaId: string | number;
  guia?: string;
  contratoId?: string | number;
  clienteNombre?: string;
  direccion?: string;
  sector?: string;
  medidorSerie?: string;
  fecha?: string | Date;
  lecturaAnterior?: number;
  lecturaActual?: number;
  consumoCalculado?: number;
  estado: string;
  tieneAnomalia?: boolean;
}

@Component({
  selector: 'app-readings-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, LocalDatePipe],
  templateUrl: './readings-table.component.html',
  styleUrl: './readings-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingsTableComponent {
  @Input() readings: IReadingRowItem[] = [];
  @Input() showSector = true;
  @Input() showActions = true;
  @Input() allowValidation = false;
  @Input() allowReReading = true;
  @Input() openDropdownId: string | null = null;

  @Output() viewDetail = new EventEmitter<IReadingRowItem>();
  @Output() editReading = new EventEmitter<IReadingRowItem>();
  @Output() approveReading = new EventEmitter<IReadingRowItem>();
  @Output() reportAnomaly = new EventEmitter<IReadingRowItem>();
  @Output() requestReReading = new EventEmitter<IReadingRowItem>();
  @Output() toggleDropdown = new EventEmitter<{ id: string; event: MouseEvent }>();

  onToggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.toggleDropdown.emit({ id: String(id), event });
  }
}
