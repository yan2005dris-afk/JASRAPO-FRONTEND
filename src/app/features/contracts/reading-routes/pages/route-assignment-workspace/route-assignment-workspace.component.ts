import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import {
  ICreateRouteAssignmentsDto,
  IReadingRoute,
  ITipoActividad,
  TipoRuta,
} from '../../interfaces/ireading-route.interface';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { User } from '../../../../users/models/user.interface';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PeriodPickerComponent } from '../../../../../shared/components/period-picker/period-picker.component';
import { PickerInputComponent } from '../../../../../shared/components/picker-input/picker-input.component';
import {
  PeriodsService,
  type IAccountingPeriod,
} from '../../../../../shared/services/periods.service';
import { OperatorColor, OPERATOR_PALETTE } from '../../../../../shared/types/operator-color';

import { RouteContractsTableComponent } from '../../components/route-contracts-table/route-contracts-table.component';
import {
  assertOperatorSelected,
  assertPeriodOpen,
} from '../../services/route-assignment-validators';
import {
  AssignmentStatus,
  clearAssignmentsForOperator,
  groupContractAssignmentsByOperatorCommunity,
  groupSectorAssignmentsByOperatorCommunity,
  resolveAssignmentStatus,
  toggleAssignment,
} from '../../services/session-assignments.helpers';
import {
  calculateGlobalCoverage,
  calculateNonLecturaCoverage,
} from '../../services/coverage-calculator';

@Component({
  selector: 'app-route-assignment-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PeriodPickerComponent,
    PickerInputComponent,
    RouteContractsTableComponent,
  ],
  templateUrl: './route-assignment-workspace.component.html',
  styleUrl: './route-assignment-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteAssignmentWorkspaceComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly sectoresService = inject(SectoresService);
  private readonly usersService = inject(UsersService);
  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);
  private readonly periodsService = inject(PeriodsService);

  // Wizard Step (1: Asignación 2 Tablas, 2: Resumen Full Width)
  readonly currentStep = signal<1 | 2>(1);

  // Catalogs
  readonly operarios = signal<User[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);
  readonly sectores = signal<Sectores[]>([]);
  readonly contratos = signal<IContract[]>([]);
  readonly tiposActividad = signal<ITipoActividad[]>([]);

  // Pre-existing routes in the active period (from Database)
  readonly periodExistingRoutes = signal<IReadingRoute[]>([]);
  readonly isLoadingRoutes = signal<boolean>(false);

  // Selection & Filters
  readonly selectedPeriod = signal<IAccountingPeriod | null>(null);
  readonly selectedPeriodId = signal<number | null>(null);
  readonly selectedOperarioId = signal<number | null>(null);
  readonly selectedComunidadId = signal<number | null>(null);
  readonly tipoActividadSeleccionada = signal<TipoRuta | string | null>(null);
  readonly customNombreBase = signal<string | null>(null);

  // Search queries & Quick filter tabs
  readonly workerSearch = signal<string>('');
  readonly communitySearch = signal<string>('');
  readonly communityFilter = signal<'all' | 'pending' | 'completed'>('all');
  readonly contractSearch = signal<string>('');
  private contractSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  // Contract pagination (server-side + visible)
  readonly contractCurrentPage = signal<number>(1);
  readonly contractPageSize = signal<number>(10);
  readonly contractTotalPages = signal<number>(1);
  readonly contractTotalEnComunidad = signal<number>(0);

  // Dynamic Session Assignments: Map of sectorId -> operarioId, and comunidadId -> operarioId (for communities without sectors)
  readonly sessionSectorAssignments = signal<Map<number, number>>(new Map());
  readonly sessionCommunityAssignments = signal<Map<number, number>>(new Map());

  // Community Card Pagination
  readonly communityCurrentPage = signal<number>(1);
  readonly communityPageSize = signal<number>(4);

  readonly isLoading = signal<boolean>(false);
  readonly isLoadingContracts = signal<boolean>(false);

  // Operator Color Mapper
  getOperatorColor(operarioId: number): OperatorColor {
    const ops = this.operarios();
    const idx = ops.findIndex((u) => u.usuarioId === operarioId);
    const colorIndex = idx >= 0 ? idx % OPERATOR_PALETTE.length : 0;
    return OPERATOR_PALETTE[colorIndex];
  }

  /** Arrow alias used by `<app-route-contracts-table>` to avoid `this` rebinding. */
  readonly getOperatorColorForChild = (operarioId: number): OperatorColor =>
    this.getOperatorColor(operarioId);

  /** Arrow alias used by `<app-route-contracts-table>` to avoid `this` rebinding. */
  readonly getOperarioNameForChild = (operarioId: number): string => this.getOperarioName(operarioId);

  isLecturaActivity(tipo: TipoRuta | string | null): boolean {
    return tipo === 'LECTURA' || tipo === 'TOMA_LECTURA' || !tipo;
  }

  // Reactive mode flag derived from the selected activity type
  readonly isLecturaMode = computed(() => this.isLecturaActivity(this.tipoActividadSeleccionada()));

  // Non-lectura: Map of contratoId -> operarioId (who the contract is assigned to in session)
  readonly sessionContractAssignments = signal<Map<number, number>>(new Map());

  // Contracts currently displayed (after visible pagination); search is now server-side,
  // so client-side filtering only handles the visible page slice (see `paginatedContratos`).
  readonly filteredContratos = computed(() => this.paginatedContratos());

  // Operators that have at least 1 contract assigned in session (non-lectura)
  readonly assignedOperatorsInContractSession = computed(() => {
    const opIds = new Set<number>();
    this.sessionContractAssignments().forEach((opId) => opIds.add(opId));
    return this.operarios().filter((op) => opIds.has(op.usuarioId));
  });

  // Count contracts assigned to an operator in session
  getOperatorSessionContractsCount(operarioId: number): number {
    let count = 0;
    this.sessionContractAssignments().forEach((opId) => {
      if (opId === operarioId) count++;
    });
    return count;
  }

  // Get contracts assigned to an operator in session
  getOperatorSessionContracts(operarioId: number): IContract[] {
    const result: IContract[] = [];
    this.sessionContractAssignments().forEach((opId, contratoId) => {
      if (opId === operarioId) {
        const contrato = this.contratos().find((c) => Number(c.contratoId) === contratoId);
        if (contrato) result.push(contrato);
      }
    });
    return result;
  }

  // Total contracts assigned across all operators in this session
  readonly totalSessionAssignedContractsCount = computed(() => {
    return this.sessionContractAssignments().size;
  });

  // Handle activity type change from dropdown
  onTipoActividadChange(codigo: string): void {
    this.tipoActividadSeleccionada.set(codigo as TipoRuta);
    // Reset contract-related state when switching
    this.sessionContractAssignments.set(new Map());
    this.contratos.set([]);
    this.contractSearch.set('');
    this.selectedComunidadId.set(null);
    this.contractCurrentPage.set(1);
    this.contractTotalPages.set(1);
    this.contractTotalEnComunidad.set(0);

    // If switching to non-lectura, reset sector assignments too (different flow)
    if (!this.isLecturaActivity(codigo)) {
      this.sessionSectorAssignments.set(new Map());
      this.sessionCommunityAssignments.set(new Map());
    }
  }

  // Load contracts for a specific community (non-lectura mode).
  // Strategy: backend doesn't expose comunidadId filter, so we iterate ALL backend pages
  // (pageSize 100) and accumulate only contracts matching the selected community client-side.
  // Once accumulated, the UI paginates visibly with `contractPageSize` (default 50) so the user
  // never sees more than 50 rows at a time even if the community has thousands of contracts.
  loadContractsForCommunity(comunidadId: number): void {
    this.selectedComunidadId.set(comunidadId);
    this.isLoadingContracts.set(true);
    this.contractCurrentPage.set(1);

    const backendLimit = 100;
    const search = this.contractSearch().trim();

    this.contractsService
      .getContracts({
        page: 1,
        limit: backendLimit,
        estadoServicio: 'ACTIVO',
        ...(search ? { search } : {}),
      })
      .subscribe({
        next: (firstPage) => {
          const ultimaPagina = firstPage.meta?.ultimaPagina ?? 1;
          const accumulate = (pages: { data: IContract[] }[]): void => {
            const all = pages.flatMap((p) => p.data);
            const filtered = all.filter((c) => c.comunidadId === comunidadId);
            this.contratos.set(filtered);
            this.contractTotalEnComunidad.set(filtered.length);
            this.contractTotalPages.set(
              Math.max(1, Math.ceil(filtered.length / this.contractPageSize())),
            );
            this.isLoadingContracts.set(false);
          };

          if (ultimaPagina <= 1) {
            accumulate([firstPage]);
            return;
          }

          const remaining = Array.from({ length: ultimaPagina - 1 }, (_, i) => i + 2).map((p) =>
            this.contractsService.getContracts({
              page: p,
              limit: backendLimit,
              estadoServicio: 'ACTIVO',
              ...(search ? { search } : {}),
            }),
          );

          forkJoin(remaining).subscribe({
            next: (rest) => accumulate([firstPage, ...rest]),
            error: () => {
              this.contratos.set([]);
              this.contractTotalEnComunidad.set(0);
              this.contractTotalPages.set(1);
              this.isLoadingContracts.set(false);
              this.toastService.show(
                'Error al cargar contratos para la comunidad seleccionada.',
                'error',
              );
            },
          });
        },
        error: () => {
          this.contratos.set([]);
          this.contractTotalEnComunidad.set(0);
          this.contractTotalPages.set(1);
          this.isLoadingContracts.set(false);
          this.toastService.show(
            'Error al cargar contratos para la comunidad seleccionada.',
            'error',
          );
        },
      });
  }

  // Search input change handler with debounce (triggers backend reload when community is selected)
  onContractSearchChange(value: string): void {
    this.contractSearch.set(value);
    if (this.contractSearchDebounce) {
      clearTimeout(this.contractSearchDebounce);
    }
    this.contractSearchDebounce = setTimeout(() => {
      const comId = this.selectedComunidadId();
      if (comId) {
        this.loadContractsForCommunity(comId);
      }
    }, 350);
  }

  // Visible pagination computed: page slice over already-loaded community contracts
  readonly paginatedContratos = computed(() => {
    const all = this.contratos();
    const page = this.contractCurrentPage();
    const size = this.contractPageSize();
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  readonly contractPagesArray = computed(() => {
    const total = this.contractTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  setContractCurrentPage(page: number): void {
    if (page >= 1 && page <= this.contractTotalPages()) {
      this.contractCurrentPage.set(page);
      // Reset scroll inside the contracts panel
      queueMicrotask(() => {
        const el = document.querySelector('.contracts-scroll-area');
        if (el) el.scrollTop = 0;
      });
    }
  }

  setContractPageSize(size: number): void {
    if (size > 0) {
      this.contractPageSize.set(size);
      this.contractTotalPages.set(Math.max(1, Math.ceil(this.contractTotalEnComunidad() / size)));
      this.contractCurrentPage.set(1);
    }
  }

  nextContractPage(): void {
    if (this.contractCurrentPage() < this.contractTotalPages()) {
      this.contractCurrentPage.update((p) => p + 1);
      queueMicrotask(() => {
        const el = document.querySelector('.contracts-scroll-area');
        if (el) el.scrollTop = 0;
      });
    }
  }

  prevContractPage(): void {
    if (this.contractCurrentPage() > 1) {
      this.contractCurrentPage.update((p) => p - 1);
      queueMicrotask(() => {
        const el = document.querySelector('.contracts-scroll-area');
        if (el) el.scrollTop = 0;
      });
    }
  }

  // Apply visible selection state for "select all visible" (operates on paginated slice)
  areAllVisibleContractsAssignedToCurrentOperator(): boolean {
    const opId = this.selectedOperarioId();
    if (!opId) return false;
    const visible = this.paginatedContratos();
    if (visible.length === 0) return false;
    const map = this.sessionContractAssignments();
    return visible.every((c) => map.get(Number(c.contratoId)) === opId);
  }

  // Toggle a single contract assignment to the current operator
  toggleContrato(contratoId: number): void {
    const opId = this.selectedOperarioId();
    if (!assertOperatorSelected(opId, this.toastService)) return;
    if (!assertPeriodOpen(this.selectedPeriod(), this.toastService)) return;
    const opIdNonNull = opId!;

    const status: AssignmentStatus = { isDbAssigned: false };
    const outcome = toggleAssignment(
      this.sessionContractAssignments(),
      contratoId,
      opIdNonNull,
      status,
    );

    switch (outcome.kind) {
      case 'assigned':
      case 'deselected':
        this.sessionContractAssignments.set(outcome.next);
        break;
      case 'blocked-by-db':
        // Contracts are never DB-assigned at toggle time; the contracts
        // panel is purely session-driven. Defensive no-op.
        break;
      case 'blocked-by-other-operator':
        this.toastService.show(
          `Este contrato ya está asignado a ${this.getOperarioName(outcome.existingOperatorId)} en esta sesión.`,
          'warning',
        );
        break;
    }
  }

  // Select/deselect all contracts visible on the current page for the current operator
  toggleAllFilteredContracts(): void {
    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show('Por favor, seleccioná un operario en la Tabla 1 primero.', 'warning');
      return;
    }

    const currentMap = new Map(this.sessionContractAssignments());
    const visible = this.paginatedContratos();
    const available = visible.filter((c) => {
      const existing = currentMap.get(Number(c.contratoId));
      return existing === undefined || existing === opId;
    });

    const allMine =
      available.length > 0 && available.every((c) => currentMap.get(Number(c.contratoId)) === opId);

    if (allMine) {
      for (const c of available) {
        currentMap.delete(Number(c.contratoId));
      }
    } else {
      for (const c of available) {
        currentMap.set(Number(c.contratoId), opId);
      }
    }

    this.sessionContractAssignments.set(currentMap);
  }

  // Clear all contract assignments for a specific operator
  clearOperatorContractAssignments(operarioId: number): void {
    this.sessionContractAssignments.set(
      clearAssignmentsForOperator(this.sessionContractAssignments(), operarioId),
    );
  }

  // Get contract assignment status
  getContratoStatus(contratoId: number): {
    isAssigned: boolean;
    isCurrentOperator: boolean;
    operarioId?: number;
    operarioName?: string;
    color?: OperatorColor;
  } {
    const assignedOpId = this.sessionContractAssignments().get(contratoId);
    if (assignedOpId == null) {
      return { isAssigned: false, isCurrentOperator: false };
    }
    const op = this.operarios().find((u) => u.usuarioId === assignedOpId);
    return {
      isAssigned: true,
      isCurrentOperator: assignedOpId === this.selectedOperarioId(),
      operarioId: assignedOpId,
      operarioName: op ? `${op.nombres} ${op.apellidos}` : `Operario #${assignedOpId}`,
      color: this.getOperatorColor(assignedOpId),
    };
  }

  // Pre-existing assigned routes mapping
  readonly existingAssignedSectorMap = computed(() => {
    const map = new Map<number, IReadingRoute>();
    for (const r of this.periodExistingRoutes()) {
      if (r.sectorId != null) {
        map.set(r.sectorId, r);
      }
    }
    return map;
  });

  // Pre-existing assigned routes for whole communities (without sectors)
  readonly existingAssignedCommunityMap = computed(() => {
    const map = new Map<number, IReadingRoute>();
    for (const r of this.periodExistingRoutes()) {
      if (r.comunidadId != null && r.sectorId == null) {
        map.set(r.comunidadId, r);
      }
    }
    return map;
  });

  // Active routes already assigned to currently selected operator in the month
  readonly selectedOperatorExistingRoutes = computed(() => {
    const opId = this.selectedOperarioId();
    if (!opId) return [];
    return this.periodExistingRoutes().filter((r) => r.operarioId === opId);
  });

  // Filtered Workers list
  readonly filteredOperarios = computed(() => {
    const q = this.workerSearch().toLowerCase().trim();
    const ops = this.operarios();
    if (!q) return ops;
    return ops.filter(
      (op) =>
        `${op.nombres} ${op.apellidos}`.toLowerCase().includes(q) ||
        (op.email && op.email.toLowerCase().includes(q)) ||
        (op.telefono && op.telefono.toLowerCase().includes(q)),
    );
  });

  // Filtered Communities list with search & quick tabs
  readonly filteredComunidades = computed(() => {
    const q = this.communitySearch().toLowerCase().trim();
    const filter = this.communityFilter();
    let list = this.comunidades();

    if (filter === 'completed') {
      list = list.filter((c) => c.id != null && this.isCommunityCompleted(c.id));
    } else if (filter === 'pending') {
      list = list.filter((c) => c.id != null && !this.isCommunityCompleted(c.id));
    }

    if (!q) return list;
    return list.filter((c) => {
      const matchName = c.nombre?.toLowerCase().includes(q);
      const matchCode = c.codigo?.toLowerCase().includes(q);
      const hasMatchingSector = this.sectores()
        .filter((s) => s.comunidadId === c.id)
        .some((s) => s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q));
      return matchName || matchCode || hasMatchingSector;
    });
  });

  // Card Pagination Computed Properties
  readonly communityTotalPages = computed(() => {
    const total = this.filteredComunidades().length;
    return Math.max(1, Math.ceil(total / this.communityPageSize()));
  });

  readonly paginatedComunidades = computed(() => {
    const list = this.filteredComunidades();
    const page = this.communityCurrentPage();
    const size = this.communityPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly communityPagesArray = computed(() => {
    const total = this.communityTotalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  setCommunityCurrentPage(page: number): void {
    if (page >= 1 && page <= this.communityTotalPages()) {
      this.communityCurrentPage.set(page);
    }
  }

  nextCommunityPage(): void {
    if (this.communityCurrentPage() < this.communityTotalPages()) {
      this.communityCurrentPage.update((p) => p + 1);
    }
  }

  prevCommunityPage(): void {
    if (this.communityCurrentPage() > 1) {
      this.communityCurrentPage.update((p) => p - 1);
    }
  }

  setCommunityFilter(filter: 'all' | 'pending' | 'completed'): void {
    this.communityFilter.set(filter);
    this.communityCurrentPage.set(1);
  }

  // Helper to get sectors for a community
  getSectoresForComunidad(comunidadId: number): Sectores[] {
    return this.sectores().filter((s) => s.comunidadId === comunidadId);
  }

  // Get current assignment status for a whole community (without sectors)
  getCommunityStatus(comunidadId: number | undefined): {
    isAssigned: boolean;
    isDbAssigned: boolean;
    isCurrentOperator: boolean;
    operarioId?: number;
    operarioName?: string;
    color?: OperatorColor;
    routeName?: string;
  } {
    if (comunidadId == null) {
      return { isAssigned: false, isDbAssigned: false, isCurrentOperator: false };
    }

    const dbRoute = this.existingAssignedCommunityMap().get(comunidadId);
    if (dbRoute) {
      const op = this.operarios().find((u) => u.usuarioId === dbRoute.operarioId);
      const color = dbRoute.operarioId ? this.getOperatorColor(dbRoute.operarioId) : undefined;
      return {
        isAssigned: true,
        isDbAssigned: true,
        isCurrentOperator: dbRoute.operarioId === this.selectedOperarioId(),
        operarioId: dbRoute.operarioId,
        operarioName: op ? `${op.nombres} ${op.apellidos}` : `Operario #${dbRoute.operarioId}`,
        color,
        routeName: dbRoute.nombre,
      };
    }

    const sessionOpId = this.sessionCommunityAssignments().get(comunidadId);
    if (sessionOpId != null) {
      const op = this.operarios().find((u) => u.usuarioId === sessionOpId);
      const color = this.getOperatorColor(sessionOpId);
      return {
        isAssigned: true,
        isDbAssigned: false,
        isCurrentOperator: sessionOpId === this.selectedOperarioId(),
        operarioId: sessionOpId,
        operarioName: op ? `${op.nombres} ${op.apellidos}` : `Operario #${sessionOpId}`,
        color,
      };
    }

    return {
      isAssigned: false,
      isDbAssigned: false,
      isCurrentOperator: false,
    };
  }

  // Get current assignment status for a sector
  getSectorStatus(sectorId: number | undefined): {
    isAssigned: boolean;
    isDbAssigned: boolean;
    isCurrentOperator: boolean;
    operarioId?: number;
    operarioName?: string;
    color?: OperatorColor;
    routeName?: string;
  } {
    if (sectorId == null) {
      return {
        isAssigned: false,
        isDbAssigned: false,
        isCurrentOperator: false,
      };
    }

    const dbRoute = this.existingAssignedSectorMap().get(sectorId);
    if (dbRoute) {
      const op = this.operarios().find((u) => u.usuarioId === dbRoute.operarioId);
      const color = dbRoute.operarioId ? this.getOperatorColor(dbRoute.operarioId) : undefined;
      return {
        isAssigned: true,
        isDbAssigned: true,
        isCurrentOperator: dbRoute.operarioId === this.selectedOperarioId(),
        operarioId: dbRoute.operarioId,
        operarioName: op ? `${op.nombres} ${op.apellidos}` : `Operario #${dbRoute.operarioId}`,
        color,
        routeName: dbRoute.nombre,
      };
    }

    const sessionOpId = this.sessionSectorAssignments().get(sectorId);
    if (sessionOpId != null) {
      const op = this.operarios().find((u) => u.usuarioId === sessionOpId);
      const color = this.getOperatorColor(sessionOpId);
      return {
        isAssigned: true,
        isDbAssigned: false,
        isCurrentOperator: sessionOpId === this.selectedOperarioId(),
        operarioId: sessionOpId,
        operarioName: op ? `${op.nombres} ${op.apellidos}` : `Operario #${sessionOpId}`,
        color,
      };
    }

    return {
      isAssigned: false,
      isDbAssigned: false,
      isCurrentOperator: false,
    };
  }

  // Check if community is 100% completed (Golden Border indicator)
  isCommunityCompleted(comunidadId: number | undefined): boolean {
    if (comunidadId == null) return false;
    const communitySectors = this.getSectoresForComunidad(comunidadId);
    if (communitySectors.length === 0) {
      return this.getCommunityStatus(comunidadId).isAssigned;
    }

    return communitySectors.every((s) => {
      if (s.sectorId == null) return true;
      const status = this.getSectorStatus(s.sectorId);
      return status.isAssigned;
    });
  }

  // Count assigned sectors for a community
  getCommunityAssignedCount(comunidadId: number | undefined): { assigned: number; total: number } {
    if (comunidadId == null) return { assigned: 0, total: 0 };
    const communitySectors = this.getSectoresForComunidad(comunidadId);
    if (communitySectors.length === 0) {
      const isAssigned = this.getCommunityStatus(comunidadId).isAssigned;
      return { assigned: isAssigned ? 1 : 0, total: 1 };
    }
    const total = communitySectors.length;
    let assigned = 0;
    for (const s of communitySectors) {
      if (s.sectorId != null && this.getSectorStatus(s.sectorId).isAssigned) {
        assigned++;
      }
    }
    return { assigned, total };
  }

  // Count routes already in database for this operator in the active period
  getOperatorExistingRoutesCount(operarioId: number): number {
    return this.periodExistingRoutes().filter((r) => r.operarioId === operarioId).length;
  }

  // Count assigned sectors in session for an operator
  getOperatorSessionSectorsCount(operarioId: number): number {
    let count = 0;
    this.sessionSectorAssignments().forEach((opId) => {
      if (opId === operarioId) count++;
    });
    this.sessionCommunityAssignments().forEach((opId) => {
      if (opId === operarioId) count++;
    });
    return count;
  }

  // Get list of session sectors and communities assigned to an operator
  getOperatorSessionSectors(operarioId: number): {
    sector?: Sectores;
    comunidad?: Comunidad;
    isFullCommunity?: boolean;
  }[] {
    const result: { sector?: Sectores; comunidad?: Comunidad; isFullCommunity?: boolean }[] = [];
    this.sessionSectorAssignments().forEach((opId, sectorId) => {
      if (opId === operarioId) {
        const sector = this.sectores().find((s) => s.sectorId === sectorId);
        if (sector) {
          const comunidad = this.comunidades().find((c) => c.id === sector.comunidadId);
          result.push({ sector, comunidad, isFullCommunity: false });
        }
      }
    });

    this.sessionCommunityAssignments().forEach((opId, comId) => {
      if (opId === operarioId) {
        const comunidad = this.comunidades().find((c) => c.id === comId);
        if (comunidad) {
          result.push({ comunidad, isFullCommunity: true });
        }
      }
    });

    return result;
  }

  // Total sectors and whole communities assigned across all operators in this session
  readonly totalSessionAssignedSectorsCount = computed(() => {
    return this.sessionSectorAssignments().size + this.sessionCommunityAssignments().size;
  });

  // Operators that have at least 1 sector or whole community assigned in session
  readonly assignedOperatorsInSession = computed(() => {
    const opIds = new Set<number>();
    this.sessionSectorAssignments().forEach((opId) => opIds.add(opId));
    this.sessionCommunityAssignments().forEach((opId) => opIds.add(opId));
    return this.operarios().filter((op) => opIds.has(op.usuarioId));
  });

  // Global coverage metrics for Step 3 Summary
  readonly globalCoverageSummary = computed(() => {
    const allComunidades = this.comunidades();
    return calculateGlobalCoverage(allComunidades, (comunidadId) =>
      this.getCommunityAssignedCount(comunidadId),
    );
  });

  // Non-lectura coverage metrics for Step 2 Summary (contracts-focused)
  readonly nonLecturaCoverageSummary = computed(() =>
    calculateNonLecturaCoverage(
      this.contractTotalEnComunidad(),
      this.sessionContractAssignments(),
      this.contratos(),
    ),
  );

  // Suggested Base Name
  readonly sugeridoNombreBase = computed(() => {
    const periodoSeleccionado = this.selectedPeriod();
    const tipo = this.tipoActividadSeleccionada();
    const tipoLabel = this.tiposActividad().find((t) => t.codigo === tipo)?.nombre ?? 'Lectura';
    const fragmentosNombre: string[] = [`Ruta ${tipoLabel}`];

    if (periodoSeleccionado?.nombre) {
      fragmentosNombre.push(periodoSeleccionado.nombre);
    }

    return fragmentosNombre.join(' - ');
  });

  readonly nombreBase = computed(() => {
    const valorPersonalizado = this.customNombreBase();
    return valorPersonalizado !== null ? valorPersonalizado : this.sugeridoNombreBase();
  });

  ngOnInit(): void {
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    this.routesService.getActivityTypes().subscribe({
      next: (res) => {
        this.tiposActividad.set(res);
        // Default to LECTURA if not already set
        if (!this.tipoActividadSeleccionada()) {
          const lectura = res.find((t) => t.codigo === 'LECTURA' || t.codigo === 'TOMA_LECTURA');
          this.tipoActividadSeleccionada.set(lectura?.codigo ?? 'LECTURA');
        }
      },
    });

    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => this.comunidades.set(res.data),
    });

    this.sectoresService.getAllSectores(1, 500).subscribe({
      next: (res) => this.sectores.set(res.data),
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        const filtered = res.data.filter((u) => {
          const roleName = u.rol?.nombre?.toLowerCase() || '';
          return roleName.includes('operador') || roleName.includes('operario');
        });
        this.operarios.set(filtered);
        if (filtered.length > 0 && !this.selectedOperarioId()) {
          this.selectedOperarioId.set(filtered[0].usuarioId);
        }
      },
    });

    this.periodsService.getPeriods().subscribe({
      next: (periods) => {
        if (!this.selectedPeriodId() && periods && periods.length > 0) {
          const openPeriod = periods.find((p) => p.estado === 'ABIERTO') || periods[0];
          this.onPeriodSelected(openPeriod);
        }
      },
    });
  }

  loadPeriodRoutes(periodoId: number): void {
    this.isLoadingRoutes.set(true);
    this.routesService
      .getRoutes({
        periodoId,
        limit: 1000,
      })
      .subscribe({
        next: (res) => {
          this.periodExistingRoutes.set(res.data || []);
          this.isLoadingRoutes.set(false);
        },
        error: () => {
          this.periodExistingRoutes.set([]);
          this.isLoadingRoutes.set(false);
        },
      });
  }

  onPeriodSelected(period: IAccountingPeriod | null): void {
    this.selectedPeriod.set(period);
    this.selectedPeriodId.set(period ? period.periodoId : null);
    this.sessionSectorAssignments.set(new Map());
    this.sessionCommunityAssignments.set(new Map());
    if (period?.periodoId) {
      this.loadPeriodRoutes(period.periodoId);
    } else {
      this.periodExistingRoutes.set([]);
    }

    if (period && period.estado !== 'ABIERTO') {
      this.toastService.show(
        `El período "${period.nombre ?? ''}" se encuentra ${period.estado}. Solo es posible consultar rutas; la asignación y despacho requieren un período ABIERTO.`,
        'warning',
      );
    }
  }

  selectOperario(operarioId: number): void {
    this.selectedOperarioId.set(operarioId);
  }

  // Toggle sector selection for currently active operator
  toggleSector(sector: Sectores): void {
    if (!sector.sectorId) return;

    if (
      !assertPeriodOpen(this.selectedPeriod(), this.toastService) ||
      !assertOperatorSelected(this.selectedOperarioId(), this.toastService, {
        message: 'Por favor, seleccioná un operario en la Tabla 1 para asignarle sectores.',
      })
    ) {
      return;
    }

    const opId = this.selectedOperarioId()!;
    const status = this.getSectorStatus(sector.sectorId);
    const assignmentStatus: AssignmentStatus = {
      isDbAssigned: status.isDbAssigned,
      assignedOperatorId: status.operarioId,
    };
    const outcome = toggleAssignment(
      this.sessionSectorAssignments(),
      sector.sectorId,
      opId,
      assignmentStatus,
    );

    switch (outcome.kind) {
      case 'assigned':
      case 'deselected':
        this.sessionSectorAssignments.set(outcome.next);
        break;
      case 'blocked-by-db':
        this.toastService.show(
          `Este sector ya tiene una ruta creada en el mes para ${status.operarioName}.`,
          'warning',
        );
        break;
      case 'blocked-by-other-operator':
        this.toastService.show(
          `El sector ${sector.nombre ?? sector.sectorId} ya está asignado a ${this.getOperarioName(outcome.existingOperatorId)} en esta sesión.`,
          'warning',
        );
        break;
    }
  }

  // Toggle direct community assignment for communities without sectors
  toggleCommunityAssignment(comunidadId: number): void {
    if (
      !assertPeriodOpen(this.selectedPeriod(), this.toastService) ||
      !assertOperatorSelected(this.selectedOperarioId(), this.toastService)
    ) {
      return;
    }

    const opId = this.selectedOperarioId()!;
    const status = this.getCommunityStatus(comunidadId);
    const assignmentStatus: AssignmentStatus = {
      isDbAssigned: status.isDbAssigned,
      assignedOperatorId: status.operarioId,
    };
    const outcome = toggleAssignment(
      this.sessionCommunityAssignments(),
      comunidadId,
      opId,
      assignmentStatus,
    );

    switch (outcome.kind) {
      case 'assigned':
      case 'deselected':
        this.sessionCommunityAssignments.set(outcome.next);
        break;
      case 'blocked-by-db':
        this.toastService.show(
          `Esta comunidad ya tiene una ruta creada en el mes para ${status.operarioName}.`,
          'warning',
        );
        break;
      case 'blocked-by-other-operator':
        this.toastService.show(
          `Esta comunidad ya está asignada a ${this.getOperarioName(outcome.existingOperatorId)} en esta sesión.`,
          'warning',
        );
        break;
    }
  }

  // Assign or toggle all available sectors in a community to current operator
  toggleAllSectorsInCommunity(comunidadId: number): void {
    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show('Por favor, seleccioná un operario en la Tabla 1 primero.', 'warning');
      return;
    }

    const communitySectors = this.getSectoresForComunidad(comunidadId);
    if (communitySectors.length === 0) {
      this.toggleCommunityAssignment(comunidadId);
      return;
    }

    const currentMap = new Map(this.sessionSectorAssignments());
    const availableSectors = communitySectors.filter((s) => {
      if (!s.sectorId) return false;
      const status = this.getSectorStatus(s.sectorId);
      return !status.isDbAssigned && (!status.operarioId || status.operarioId === opId);
    });

    const allAssignedToMe =
      availableSectors.length > 0 &&
      availableSectors.every((s) => currentMap.get(s.sectorId!) === opId);

    if (allAssignedToMe) {
      for (const s of availableSectors) {
        if (s.sectorId) currentMap.delete(s.sectorId);
      }
    } else {
      for (const s of availableSectors) {
        if (s.sectorId) currentMap.set(s.sectorId, opId);
      }
    }

    this.sessionSectorAssignments.set(currentMap);
  }

  // Assign all available sectors across all communities to currently active operator
  assignAllAvailable(): void {
    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show('Por favor, seleccioná un operario en la Tabla 1 primero.', 'warning');
      return;
    }

    const currentMap = new Map(this.sessionSectorAssignments());
    const currentComMap = new Map(this.sessionCommunityAssignments());
    let assignedCount = 0;

    for (const sec of this.sectores()) {
      if (!sec.sectorId) continue;
      const status = this.getSectorStatus(sec.sectorId);
      if (!status.isDbAssigned && !status.isAssigned) {
        currentMap.set(sec.sectorId, opId);
        assignedCount++;
      }
    }

    for (const com of this.comunidades()) {
      if (!com.id) continue;
      const comSectors = this.getSectoresForComunidad(com.id);
      if (comSectors.length === 0) {
        const comStatus = this.getCommunityStatus(com.id);
        if (!comStatus.isDbAssigned && !comStatus.isAssigned) {
          currentComMap.set(com.id, opId);
          assignedCount++;
        }
      }
    }

    if (assignedCount === 0) {
      this.toastService.show(
        'No hay sectores ni comunidades libres disponibles para asignar.',
        'info',
      );
      return;
    }

    this.sessionSectorAssignments.set(currentMap);
    this.sessionCommunityAssignments.set(currentComMap);
    this.toastService.show(
      `Se asignaron ${assignedCount} sector(es)/comunidad(es) libres al operario activo.`,
      'success',
    );
  }

  removeOperatorSector(sectorId: number): void {
    const currentMap = new Map(this.sessionSectorAssignments());
    currentMap.delete(sectorId);
    this.sessionSectorAssignments.set(currentMap);
  }

  removeOperatorCommunity(comunidadId: number): void {
    const currentMap = new Map(this.sessionCommunityAssignments());
    currentMap.delete(comunidadId);
    this.sessionCommunityAssignments.set(currentMap);
  }

  removeOperatorContract(contratoId: number): void {
    const currentMap = new Map(this.sessionContractAssignments());
    currentMap.delete(contratoId);
    this.sessionContractAssignments.set(currentMap);
  }

  clearOperatorSessionAssignments(operarioId: number): void {
    this.sessionSectorAssignments.set(
      clearAssignmentsForOperator(this.sessionSectorAssignments(), operarioId),
    );
    this.sessionCommunityAssignments.set(
      clearAssignmentsForOperator(this.sessionCommunityAssignments(), operarioId),
    );
  }

  resetSessionAssignments(): void {
    if (
      this.sessionSectorAssignments().size === 0 &&
      this.sessionCommunityAssignments().size === 0 &&
      this.sessionContractAssignments().size === 0
    )
      return;
    this.sessionSectorAssignments.set(new Map());
    this.sessionCommunityAssignments.set(new Map());
    this.sessionContractAssignments.set(new Map());
    this.toastService.show('Se descartaron todas las asignaciones de la sesión.', 'info');
  }

  // Navigation between Step 1 (2 Tables) and Step 2 (Full Width Summary)
  goToSummary(): void {
    const period = this.selectedPeriod();
    if (!period || period.estado !== 'ABIERTO') {
      this.toastService.show(
        'Solo se pueden planificar y despachar rutas para un período abierto.',
        'warning',
      );
      return;
    }

    const hasAssignments = this.isLecturaMode()
      ? this.totalSessionAssignedSectorsCount() > 0
      : this.totalSessionAssignedContractsCount() > 0;

    if (!hasAssignments) {
      this.toastService.show(
        this.isLecturaMode()
          ? 'No has asignado ningún sector o comunidad en esta sesión todavía.'
          : 'No has asignado ningún contrato en esta sesión todavía.',
        'warning',
      );
      return;
    }
    this.currentStep.set(2);
  }

  backToAssignment(): void {
    this.currentStep.set(1);
  }

  // Execution: Dispatch routes for all assigned operators
  confirmAndDispatchAll(): void {
    const period = this.selectedPeriod();
    if (!period || period.estado !== 'ABIERTO') {
      this.toastService.show('El período operativo debe estar abierto.', 'error');
      return;
    }

    const lecturaMode = this.isLecturaMode();
    const assignedOperators = lecturaMode
      ? this.assignedOperatorsInSession()
      : this.assignedOperatorsInContractSession();
    if (assignedOperators.length === 0) {
      this.toastService.show('No hay asignaciones para despachar.', 'warning');
      return;
    }

    const message = lecturaMode
      ? `¿Estás seguro de confirmar y generar las rutas de trabajo para ${assignedOperators.length} operario(s) con un total de ${this.totalSessionAssignedSectorsCount()} sector(es)/comunidad(es) para el período ${period.nombre}?`
      : `¿Estás seguro de confirmar y generar las rutas con un total de ${this.totalSessionAssignedContractsCount()} contrato(s) distribuidos entre ${assignedOperators.length} operario(s) para el período ${period.nombre}?`;

    this.dialogService
      .confirm({
        title: 'Confirmar y Despachar Rutas',
        message,
        confirmText: 'Sí, Despachar Rutas',
        cancelText: 'Revisar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.executeBatchAssignments();
        }
      });
  }

  executeBatchAssignments(): void {
    this.isLoading.set(true);
    const periodId = this.selectedPeriodId()!;
    const tipoRuta = (this.tipoActividadSeleccionada() as TipoRuta) || 'LECTURA';
    const nombreBase = this.nombreBase().trim() || undefined;

    const requests: ICreateRouteAssignmentsDto[] = [];

    if (this.isLecturaMode()) {
      // Lectura flow: group by operator -> community -> sectorIds
      const grouped = groupSectorAssignmentsByOperatorCommunity(
        this.sessionSectorAssignments(),
        this.sectores() as ReadonlyArray<{ sectorId: number; comunidadId: number }>,
      );
      grouped.forEach((comMap, opId) => {
        comMap.forEach((sectorIds, comunidadId) => {
          requests.push({
            periodoId: periodId,
            operarioId: opId,
            comunidadId,
            tipoRuta,
            sectorIds,
            nombreBase,
          });
        });
      });

      // Whole community assignments (without sectors) stay inline because
      // they bypass the sector grouping helper.
      this.sessionCommunityAssignments().forEach((opId, comunidadId) => {
        requests.push({
          periodoId: periodId,
          operarioId: opId,
          comunidadId,
          tipoRuta,
          sectorIds: [],
          nombreBase,
        });
      });
    } else {
      // Non-lectura flow: group by operator -> community -> contratoIds
      const grouped = groupContractAssignmentsByOperatorCommunity(
        this.sessionContractAssignments(),
        this.contratos(),
      );
      grouped.forEach((comMap, opId) => {
        comMap.forEach((contratoIds, comunidadId) => {
          requests.push({
            periodoId: periodId,
            operarioId: opId,
            comunidadId,
            tipoRuta,
            contratoIds,
            nombreBase,
          });
        });
      });
    }

    if (requests.length === 0) {
      this.isLoading.set(false);
      return;
    }

    const observables = requests.map((dto) => this.routesService.createAssignments(dto));
    forkJoin(observables).subscribe({
      next: (results) => {
        this.isLoading.set(false);
        const totalCreated = results.reduce((acc, curr) => acc + curr.length, 0);
        const tipoLabel =
          this.tiposActividad().find((t) => t.codigo === this.tipoActividadSeleccionada())
            ?.nombre ?? 'lectura';
        this.toastService.show(
          `¡Rutas despachadas con éxito! Se generaron ${totalCreated} ruta(s) de ${tipoLabel.toLowerCase()}.`,
          'success',
        );
        this.router.navigate(['/app/Contratos/RutasDeLectura']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.show(
          err.error?.message || 'Ocurrió un error al despachar las rutas.',
          'error',
        );
      },
    });
  }

  getOperarioName(operarioId: number): string {
    const op = this.operarios().find((u) => u.usuarioId === operarioId);
    return op ? `${op.nombres} ${op.apellidos}` : `Operario #${operarioId}`;
  }

  getComunidadName(comunidadId: number): string {
    const com = this.comunidades().find((c) => c.id === comunidadId);
    return com ? com.nombre : `Comunidad #${comunidadId}`;
  }

  goBack(): void {
    this.router.navigate(['/app/Contratos/RutasDeLectura']);
  }
}
