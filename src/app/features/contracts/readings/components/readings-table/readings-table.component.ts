import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  routeEstado?: string | null;
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
  readonly readings = input<IReadingRowItem[]>([]);
  readonly showSector = input(true);
  readonly showActions = input(true);
  readonly allowValidation = input(false);
  readonly allowReReading = input(true);
  readonly allowEditing = input(true);
  readonly openDropdownId = input<string | null>(null);

  readonly viewDetail = output<IReadingRowItem>();
  readonly editReading = output<IReadingRowItem>();
  readonly approveReading = output<IReadingRowItem>();
  readonly reportAnomaly = output<IReadingRowItem>();
  readonly requestReReading = output<IReadingRowItem>();
  readonly toggleDropdown = output<{ id: string; event: MouseEvent }>();

  onToggleDropdown(id: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.toggleDropdown.emit({ id: String(id), event });
  }
}
