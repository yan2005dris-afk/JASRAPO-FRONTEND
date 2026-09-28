import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerInputComponent } from '../../../../../shared/components/picker-input/picker-input.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { resolveClientDisplayName } from '../../../../../shared/utils/client-display-name';
import { OperatorColor } from '../../../../../shared/types/operator-color';

export interface ContratoAssignmentStatus {
  isAssigned: boolean;
  isCurrentOperator: boolean;
  operarioId: number | null;
  operarioName: string;
  color: OperatorColor | null;
}

@Component({
  selector: 'app-route-contracts-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerInputComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './route-contracts-table.component.html',
  styleUrl: './route-contracts-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteContractsTableComponent {
  // Inputs
  readonly comunidades = input.required<Comunidad[]>();
  readonly selectedComunidadId = input<number | null>(null);
  readonly contracts = input.required<IContract[]>();
  readonly totalContracts = input<number>(0);
  readonly searchQuery = input<string>('');
  readonly currentPage = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly totalPages = input<number>(1);
  readonly isLoading = input<boolean>(false);
  readonly selectedOperarioId = input<number | null>(null);
  readonly assignments = input.required<Map<number, number>>();
  readonly operatorColorResolver = input.required<(operarioId: number) => OperatorColor>();
  readonly operatorNameResolver = input.required<(operarioId: number) => string>();

  // Outputs
  readonly comunidadChange = output<number>();
  readonly searchChange = output<string>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly contractToggled = output<number>();
  readonly toggleAllVisibleRequested = output<void>();

  // Visible page slice
  readonly paginatedContracts = computed(() => {
    const list = this.contracts();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly areAllVisibleAssigned = computed(() => {
    const opId = this.selectedOperarioId();
    if (!opId) return false;
    const visible = this.paginatedContracts();
    if (visible.length === 0) return false;
    const map = this.assignments();
    return visible.every((c) => map.get(Number(c.contratoId)) === opId);
  });

  formatClient(cliente: IContract['cliente']): string {
    return resolveClientDisplayName(cliente);
  }

  getContratoStatus(contratoId: number): ContratoAssignmentStatus {
    const map = this.assignments();
    const currentOpId = this.selectedOperarioId();
    const assignedOpId = map.get(contratoId);

    if (assignedOpId == null) {
      return {
        isAssigned: false,
        isCurrentOperator: false,
        operarioId: null,
        operarioName: '',
        color: null,
      };
    }

    const isCurrent = assignedOpId === currentOpId;
    return {
      isAssigned: true,
      isCurrentOperator: isCurrent,
      operarioId: assignedOpId,
      operarioName: this.operatorNameResolver()(assignedOpId),
      color: this.operatorColorResolver()(assignedOpId),
    };
  }

  onSelectComunidad(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) {
      this.comunidadChange.emit(Number(val));
    }
  }

  onToggle(contratoId: number): void {
    this.contractToggled.emit(contratoId);
  }

  onToggleAll(): void {
    this.toggleAllVisibleRequested.emit();
  }

  onPageSelect(page: number): void {
    this.pageChange.emit(page);
    queueMicrotask(() => {
      const el = document.querySelector('.contracts-scroll-area');
      if (el) el.scrollTop = 0;
    });
  }
}
