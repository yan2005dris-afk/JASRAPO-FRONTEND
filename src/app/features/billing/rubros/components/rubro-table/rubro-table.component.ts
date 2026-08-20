import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IRubro, TipoRubro } from '../../interfaces/irubro.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-rubro-table',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './rubro-table.component.html',
  styleUrl: './rubro-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubroTableComponent {
  readonly rubros = input<IRubro[]>([]);
  readonly isLoading = input(false);
  readonly selectionMode = input(false);
  readonly selectedRubroId = input<number | null>(null);

  readonly rubroSelected = output<IRubro>();
  readonly editRubro = output<IRubro>();
  readonly toggleStatus = output<IRubro>();
  readonly deleteRubro = output<IRubro>();
  readonly createClicked = output<void>();

  readonly openDropdownId = signal<number | null>(null);

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((curr) => (curr === id ? null : id));
  }

  closeDropdown(): void {
    this.openDropdownId.set(null);
  }

  select(rubro: IRubro): void {
    this.rubroSelected.emit(rubro);
  }

  getTipoBadgeClass(tipo: TipoRubro): string {
    switch (tipo) {
      case 'FIJO':
        return 'bg-primary-subtle text-primary-emphasis border border-primary-subtle';
      case 'VARIABLE':
        return 'bg-success-subtle text-success-emphasis border border-success-subtle';
      case 'MULTA':
        return 'bg-danger-subtle text-danger-emphasis border border-danger-subtle';
      case 'BIEN':
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      case 'SERVICIO':
        return 'bg-info-subtle text-info-emphasis border border-info-subtle';
      default:
        return 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle';
    }
  }

  getTipoLabel(tipo: TipoRubro): string {
    switch (tipo) {
      case 'FIJO':
        return 'Fijo';
      case 'VARIABLE':
        return 'Variable (m³)';
      case 'MULTA':
        return 'Multa / Recargo';
      case 'BIEN':
        return 'Bien';
      case 'SERVICIO':
        return 'Servicio';
      default:
        return 'Otro';
    }
  }
}
