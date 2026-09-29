import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import {
  getContractCollectionState,
  getContractServiceState,
  type IContract,
  type IHistorialMedidor,
} from '../../domain/models/service-contract.model';

export type ContractsTableMode = 'manage' | 'select';

@Component({
  selector: 'app-contracts-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './contracts-table.component.html',
  styleUrl: './contracts-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractsTableComponent {
  readonly contracts = input.required<IContract[]>();
  readonly mode = input<ContractsTableMode>('manage');
  readonly selectedContract = input<IContract | null>(null);

  // Events para modo 'select'
  readonly contractSelected = output<IContract>();
  readonly contractDoubleClicked = output<IContract>();

  // Events para modo 'manage'
  readonly edit = output<IContract>();
  readonly assignRoute = output<IContract>();
  readonly replaceMeter = output<IContract>();

  readonly openDropdownId = signal<string | null>(null);

  toggleDropdown(contratoId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((id) => (id === contratoId ? null : contratoId));
  }

  closeDropdowns(): void {
    this.openDropdownId.set(null);
  }

  getCurrentMeter(contract: IContract): IHistorialMedidor | null {
    return contract.historialMedidores?.find((h) => h.fechaHasta === null) ?? null;
  }

  getClientName(contract: IContract): string {
    const cliente = contract.cliente;
    if (!cliente) return '—';
    if (cliente.razonSocial) return cliente.razonSocial;
    return `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim() || '—';
  }

  isContractSelected(contract: IContract): boolean {
    return this.selectedContract()?.contratoId === contract.contratoId;
  }

  canAssignInstallationRoute(contract: IContract): boolean {
    return getContractServiceState(contract) === 'PENDIENTE_INSTALACION';
  }

  getServiceState(contract: IContract): string {
    return getContractServiceState(contract);
  }

  getCollectionState(contract: IContract): string | undefined {
    return getContractCollectionState(contract);
  }

  onRowClick(contract: IContract): void {
    if (this.mode() === 'select') {
      this.contractSelected.emit(contract);
    }
  }

  onRowDoubleClick(contract: IContract): void {
    if (this.mode() === 'select') {
      this.contractDoubleClicked.emit(contract);
    }
  }

  onSelectButtonClick(contract: IContract, event: MouseEvent): void {
    event.stopPropagation();
    this.contractDoubleClicked.emit(contract);
  }

  onEditClick(contract: IContract, event: MouseEvent): void {
    event.stopPropagation();
    this.closeDropdowns();
    this.edit.emit(contract);
  }

  onAssignRouteClick(contract: IContract, event: MouseEvent): void {
    event.stopPropagation();
    this.closeDropdowns();
    this.assignRoute.emit(contract);
  }

  onReplaceMeterClick(contract: IContract, event: MouseEvent): void {
    event.stopPropagation();
    this.closeDropdowns();
    this.replaceMeter.emit(contract);
  }
}
