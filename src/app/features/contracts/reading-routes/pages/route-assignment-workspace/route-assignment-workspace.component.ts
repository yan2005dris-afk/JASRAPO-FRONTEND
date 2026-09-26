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
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';

export interface OperatorColor {
  id: string;
  name: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
  lightBg: string;
  contrastText: string;
}

export const OPERATOR_PALETTE: OperatorColor[] = [
  {
    id: 'teal',
    name: 'Teal Corporativo',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-primary-subtle',
    textClass: 'text-primary',
    borderClass: 'border-primary',
    hex: '#087a7d',
    lightBg: '#f0fdfa',
    contrastText: '#065e60',
  },
  {
    id: 'marine',
    name: 'Slate Marino',
    badgeClass: 'text-bg-secondary',
    bgClass: 'bg-secondary-subtle',
    textClass: 'text-secondary',
    borderClass: 'border-secondary',
    hex: '#0f2938',
    lightBg: '#f1f5f9',
    contrastText: '#0f2938',
  },
  {
    id: 'blue',
    name: 'Azul Acuático',
    badgeClass: 'text-bg-info',
    bgClass: 'bg-info-subtle',
    textClass: 'text-info',
    borderClass: 'border-info',
    hex: '#0284c7',
    lightBg: '#e0f2fe',
    contrastText: '#0369a1',
  },
  {
    id: 'emerald',
    name: 'Verde Bosque',
    badgeClass: 'text-bg-success',
    bgClass: 'bg-success-subtle',
    textClass: 'text-success',
    borderClass: 'border-success',
    hex: '#15803d',
    lightBg: '#dcfce7',
    contrastText: '#166534',
  },
  {
    id: 'slate',
    name: 'Pizarra',
    badgeClass: 'text-bg-dark',
    bgClass: 'bg-light',
    textClass: 'text-dark',
    borderClass: 'border-dark-subtle',
    hex: '#475569',
    lightBg: '#f8fafc',
    contrastText: '#334155',
  },
  {
    id: 'cyan',
    name: 'Cian',
    badgeClass: 'text-bg-info',
    bgClass: 'bg-info-subtle',
    textClass: 'text-info',
    borderClass: 'border-info',
    hex: '#0c9ea1',
    lightBg: '#e6f7f8',
    contrastText: '#087a7d',
  },
  {
    id: 'indigo',
    name: 'Índigo Suave',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-primary-subtle',
    textClass: 'text-primary',
    borderClass: 'border-primary',
    hex: '#3b82f6',
    lightBg: '#eff6ff',
    contrastText: '#1d4ed8',
  },
  {
    id: 'steel',
    name: 'Acero',
    badgeClass: 'text-bg-secondary',
    bgClass: 'bg-secondary-subtle',
    textClass: 'text-secondary',
    borderClass: 'border-secondary',
    hex: '#64748b',
    lightBg: '#f1f5f9',
    contrastText: '#1e293b',
  },
];

@Component({
  selector: 'app-route-assignment-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, PeriodPickerComponent, PickerInputComponent],
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
  readonly tipoActividadSeleccionada = signal<TipoRuta | string | null>('LECTURA');
  readonly fechaPlanificada = signal<string>(
    new Date().toISOString().slice(0, 7), // 'YYYY-MM'
  );
  readonly customNombreBase = signal<string | null>(null);

  // Search queries & Quick filter tabs
  readonly workerSearch = signal<string>('');
  readonly communitySearch = signal<string>('');
  readonly communityFilter = signal<'all' | 'pending' | 'completed'>('all');
  readonly contractSearch = signal<string>('');

  // Dynamic Session Assignments: Map of sectorId -> operarioId, and comunidadId -> operarioId (for communities without sectors)
  readonly sessionSectorAssignments = signal<Map<number, number>>(new Map());
  readonly sessionCommunityAssignments = signal<Map<number, number>>(new Map());
  // Non-lectura: selected contract IDs
  readonly selectedContratoIds = signal<number[]>([]);

  // Community Card Pagination
  readonly communityCurrentPage = signal<number>(1);
  readonly communityPageSize = signal<number>(4);

  readonly isLoading = signal<boolean>(false);
  readonly isLoadingContracts = signal<boolean>(false);

  private readonly MONTH_NAMES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Operator Color Mapper
  getOperatorColor(operarioId: number): OperatorColor {
    const ops = this.operarios();
    const idx = ops.findIndex((u) => u.usuarioId === operarioId);
    const colorIndex = idx >= 0 ? idx % OPERATOR_PALETTE.length : 0;
    return OPERATOR_PALETTE[colorIndex];
  }

  isLecturaActivity(tipo: TipoRuta | string | null): boolean {
    return tipo === 'LECTURA' || tipo === 'TOMA_LECTURA' || !tipo;
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

  readonly existingCommunityRoutes = computed(() => {
    const map = new Map<number, IReadingRoute[]>();
    for (const r of this.periodExistingRoutes()) {
      if (r.comunidadId != null) {
        const list = map.get(r.comunidadId) || [];
        list.push(r);
        map.set(r.comunidadId, list);
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
    let fullyCompletedCommunities = 0;
    let partialCommunities = 0;
    let unassignedCommunities = 0;
    let totalSectors = 0;
    let totalAssignedSectors = 0;

    for (const c of allComunidades) {
      if (c.id == null) continue;
      const { assigned, total } = this.getCommunityAssignedCount(c.id);
      totalSectors += total;
      totalAssignedSectors += assigned;
      if (total > 0 && assigned === total) {
        fullyCompletedCommunities++;
      } else if (assigned > 0) {
        partialCommunities++;
      } else {
        unassignedCommunities++;
      }
    }

    const totalCommunities = allComunidades.length;
    const completedPct =
      totalCommunities > 0 ? Math.round((fullyCompletedCommunities / totalCommunities) * 100) : 0;

    return {
      fullyCompletedCommunities,
      partialCommunities,
      unassignedCommunities,
      totalSectors,
      totalAssignedSectors,
      pendingSectors: Math.max(0, totalSectors - totalAssignedSectors),
      totalCommunities,
      completedPct,
    };
  });

  // Suggested Base Name
  readonly sugeridoNombreBase = computed(() => {
    const periodoSeleccionado = this.selectedPeriod();
    const fechaObjetivo = this.fechaPlanificada();
    const fragmentosNombre: string[] = ['Ruta Lectura'];

    if (periodoSeleccionado?.nombre) {
      fragmentosNombre.push(periodoSeleccionado.nombre);
    }

    if (fechaObjetivo && /^\d{4}-\d{2}/.test(fechaObjetivo)) {
      const [, mesString] = fechaObjetivo.split('-');
      const indiceMes = parseInt(mesString, 10) - 1;
      if (indiceMes >= 0 && indiceMes < this.MONTH_NAMES.length) {
        fragmentosNombre.push(this.MONTH_NAMES[indiceMes]);
      }
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
      next: (res) => this.tiposActividad.set(res),
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
  }

  selectOperario(operarioId: number): void {
    this.selectedOperarioId.set(operarioId);
  }

  // Toggle sector selection for currently active operator
  toggleSector(sector: Sectores): void {
    if (!sector.sectorId) return;

    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show(
        'Por favor, seleccioná un operario en la Tabla 1 para asignarle sectores.',
        'warning',
      );
      return;
    }

    const currentMap = new Map(this.sessionSectorAssignments());
    const status = this.getSectorStatus(sector.sectorId);

    // If already in database, block
    if (status.isDbAssigned) {
      this.toastService.show(
        `Este sector ya tiene una ruta creada en el mes para ${status.operarioName}.`,
        'warning',
      );
      return;
    }

    // If assigned to current operator in session => deselect
    if (status.operarioId === opId) {
      currentMap.delete(sector.sectorId);
      this.sessionSectorAssignments.set(currentMap);
      return;
    }

    // If assigned to another operator in session => dynamic exclusion block with friendly notice
    if (status.operarioId && status.operarioId !== opId) {
      this.toastService.show(
        `El sector ${sector.nombre ?? sector.sectorId} ya está asignado a ${status.operarioName} en esta sesión.`,
        'warning',
      );
      return;
    }

    // Available => assign to current operator
    currentMap.set(sector.sectorId, opId);
    this.sessionSectorAssignments.set(currentMap);
  }

  // Toggle direct community assignment for communities without sectors
  toggleCommunityAssignment(comunidadId: number): void {
    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show('Por favor, seleccioná un operario en la Tabla 1 primero.', 'warning');
      return;
    }

    const status = this.getCommunityStatus(comunidadId);
    if (status.isDbAssigned) {
      this.toastService.show(
        `Esta comunidad ya tiene una ruta creada en el mes para ${status.operarioName}.`,
        'warning',
      );
      return;
    }

    const currentMap = new Map(this.sessionCommunityAssignments());

    if (status.operarioId === opId) {
      currentMap.delete(comunidadId);
      this.sessionCommunityAssignments.set(currentMap);
      return;
    }

    if (status.operarioId && status.operarioId !== opId) {
      this.toastService.show(
        `Esta comunidad ya está asignada a ${status.operarioName} en esta sesión.`,
        'warning',
      );
      return;
    }

    currentMap.set(comunidadId, opId);
    this.sessionCommunityAssignments.set(currentMap);
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
      this.toastService.show('No hay sectores ni comunidades libres disponibles para asignar.', 'info');
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

  clearOperatorSessionAssignments(operarioId: number): void {
    const currentMap = new Map(this.sessionSectorAssignments());
    currentMap.forEach((opId, sectorId) => {
      if (opId === operarioId) {
        currentMap.delete(sectorId);
      }
    });
    this.sessionSectorAssignments.set(currentMap);

    const currentComMap = new Map(this.sessionCommunityAssignments());
    currentComMap.forEach((opId, comId) => {
      if (opId === operarioId) {
        currentComMap.delete(comId);
      }
    });
    this.sessionCommunityAssignments.set(currentComMap);
  }

  resetSessionAssignments(): void {
    if (this.sessionSectorAssignments().size === 0 && this.sessionCommunityAssignments().size === 0) return;
    this.sessionSectorAssignments.set(new Map());
    this.sessionCommunityAssignments.set(new Map());
    this.toastService.show('Se descartaron todas las asignaciones de la sesión.', 'info');
  }

  // Navigation between Step 1 (2 Tables) and Step 2 (Full Width Summary)
  goToSummary(): void {
    if (this.totalSessionAssignedSectorsCount() === 0) {
      this.toastService.show('No has asignado ningún sector o comunidad en esta sesión todavía.', 'warning');
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

    const assignedOperators = this.assignedOperatorsInSession();
    if (assignedOperators.length === 0) {
      this.toastService.show('No hay asignaciones para despachar.', 'warning');
      return;
    }

    const totalSectors = this.totalSessionAssignedSectorsCount();
    this.dialogService
      .confirm({
        title: 'Confirmar y Despachar Rutas',
        message: `¿Estás seguro de confirmar y generar las rutas de trabajo para ${assignedOperators.length} operario(s) con un total de ${totalSectors} sector(es)/comunidad(es) para el período ${period.nombre}?`,
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
    let fechaToSend = this.fechaPlanificada() || undefined;
    if (fechaToSend && /^\d{4}-\d{2}$/.test(fechaToSend)) {
      fechaToSend = `${fechaToSend}-01`;
    }

    const operatorCommunityMap = new Map<number, Map<number, number[]>>();
    this.sessionSectorAssignments().forEach((opId, sectorId) => {
      const sector = this.sectores().find((s) => s.sectorId === sectorId);
      if (!sector) return;
      const comId = sector.comunidadId;

      if (!operatorCommunityMap.has(opId)) {
        operatorCommunityMap.set(opId, new Map());
      }
      const comMap = operatorCommunityMap.get(opId)!;
      const secList = comMap.get(comId) || [];
      secList.push(sectorId);
      comMap.set(comId, secList);
    });

    const requests: ICreateRouteAssignmentsDto[] = [];
    operatorCommunityMap.forEach((comMap, opId) => {
      comMap.forEach((sectorIds, comunidadId) => {
        requests.push({
          periodoId: periodId,
          operarioId: opId,
          comunidadId,
          tipoRuta: (this.tipoActividadSeleccionada() as TipoRuta) || 'LECTURA',
          sectorIds,
          fechaPlanificada: fechaToSend,
          nombreBase: this.nombreBase().trim() || undefined,
        });
      });
    });

    // Whole community assignments (without sectors)
    this.sessionCommunityAssignments().forEach((opId, comunidadId) => {
      requests.push({
        periodoId: periodId,
        operarioId: opId,
        comunidadId,
        tipoRuta: (this.tipoActividadSeleccionada() as TipoRuta) || 'LECTURA',
        sectorIds: [],
        fechaPlanificada: fechaToSend,
        nombreBase: this.nombreBase().trim() || undefined,
      });
    });

    if (requests.length === 0) {
      this.isLoading.set(false);
      return;
    }

    const observables = requests.map((dto) => this.routesService.createAssignments(dto));
    forkJoin(observables).subscribe({
      next: (results) => {
        this.isLoading.set(false);
        const totalCreated = results.reduce((acc, curr) => acc + curr.length, 0);
        this.toastService.show(
          `¡Rutas despachadas con éxito! Se generaron ${totalCreated} ruta(s) de lectura.`,
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
