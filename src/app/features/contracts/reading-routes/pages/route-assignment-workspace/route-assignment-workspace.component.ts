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
    id: 'blue',
    name: 'Azul',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-primary-subtle',
    textClass: 'text-primary',
    borderClass: 'border-primary',
    hex: '#0d6efd',
    lightBg: '#e7f1ff',
    contrastText: '#0a58ca',
  },
  {
    id: 'emerald',
    name: 'Verde',
    badgeClass: 'text-bg-success',
    bgClass: 'bg-success-subtle',
    textClass: 'text-success',
    borderClass: 'border-success',
    hex: '#198754',
    lightBg: '#e8f5e9',
    contrastText: '#0f5132',
  },
  {
    id: 'purple',
    name: 'Morado',
    badgeClass: 'text-bg-dark',
    bgClass: 'bg-purple-subtle',
    textClass: 'text-purple',
    borderClass: 'border-purple',
    hex: '#6f42c1',
    lightBg: '#f3e8ff',
    contrastText: '#59359a',
  },
  {
    id: 'orange',
    name: 'Naranja',
    badgeClass: 'text-bg-warning',
    bgClass: 'bg-warning-subtle',
    textClass: 'text-warning-emphasis',
    borderClass: 'border-warning',
    hex: '#fd7e14',
    lightBg: '#fff3e0',
    contrastText: '#b35300',
  },
  {
    id: 'cyan',
    name: 'Cian',
    badgeClass: 'text-bg-info',
    bgClass: 'bg-info-subtle',
    textClass: 'text-info-emphasis',
    borderClass: 'border-info',
    hex: '#0dcaf0',
    lightBg: '#e0f7fa',
    contrastText: '#055160',
  },
  {
    id: 'pink',
    name: 'Rosa',
    badgeClass: 'text-bg-danger',
    bgClass: 'bg-danger-subtle',
    textClass: 'text-danger',
    borderClass: 'border-danger',
    hex: '#d63384',
    lightBg: '#fce4ec',
    contrastText: '#880e4f',
  },
  {
    id: 'indigo',
    name: 'Índigo',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-indigo-subtle',
    textClass: 'text-indigo',
    borderClass: 'border-indigo',
    hex: '#6610f2',
    lightBg: '#ede7f6',
    contrastText: '#4527a0',
  },
  {
    id: 'teal',
    name: 'Teal',
    badgeClass: 'text-bg-success',
    bgClass: 'bg-teal-subtle',
    textClass: 'text-teal',
    borderClass: 'border-teal',
    hex: '#20c997',
    lightBg: '#e0f2f1',
    contrastText: '#004d40',
  },
];

@Component({
  selector: 'app-route-assignment-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PeriodPickerComponent,
    PickerInputComponent,
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

  // Search queries
  readonly workerSearch = signal<string>('');
  readonly communitySearch = signal<string>('');
  readonly contractSearch = signal<string>('');

  // Dynamic Session Assignments: Map of sectorId -> operarioId
  readonly sessionSectorAssignments = signal<Map<number, number>>(new Map());
  // Non-lectura: selected contract IDs
  readonly selectedContratoIds = signal<number[]>([]);

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

  // Filtered Communities list with search
  readonly filteredComunidades = computed(() => {
    const q = this.communitySearch().toLowerCase().trim();
    const list = this.comunidades();
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

  // Helper to get sectors for a community
  getSectoresForComunidad(comunidadId: number): Sectores[] {
    return this.sectores().filter((s) => s.comunidadId === comunidadId);
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

  // Check if community is 100% completed (Yellow Border indicator)
  isCommunityCompleted(comunidadId: number | undefined): boolean {
    if (comunidadId == null) return false;
    const communitySectors = this.getSectoresForComunidad(comunidadId);
    if (communitySectors.length === 0) {
      // If community has no sectors, check if whole community route exists
      const existing = this.existingCommunityRoutes().get(comunidadId);
      return (existing && existing.length > 0) || false;
    }

    // Check if every sector is assigned either in DB or in current session
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
    const total = communitySectors.length;
    let assigned = 0;
    for (const s of communitySectors) {
      if (s.sectorId != null && this.getSectorStatus(s.sectorId).isAssigned) {
        assigned++;
      }
    }
    return { assigned, total };
  }

  // Count assigned sectors in session for an operator
  getOperatorSessionSectorsCount(operarioId: number): number {
    let count = 0;
    this.sessionSectorAssignments().forEach((opId) => {
      if (opId === operarioId) count++;
    });
    return count;
  }

  // Get list of session sectors assigned to an operator
  getOperatorSessionSectors(operarioId: number): Array<{ sector: Sectores; comunidad?: Comunidad }> {
    const result: Array<{ sector: Sectores; comunidad?: Comunidad }> = [];
    this.sessionSectorAssignments().forEach((opId, sectorId) => {
      if (opId === operarioId) {
        const sector = this.sectores().find((s) => s.sectorId === sectorId);
        if (sector) {
          const comunidad = this.comunidades().find((c) => c.id === sector.comunidadId);
          result.push({ sector, comunidad });
        }
      }
    });
    return result;
  }

  // Total sectors assigned across all operators in this session
  readonly totalSessionAssignedSectorsCount = computed(() => {
    return this.sessionSectorAssignments().size;
  });

  // Operators that have at least 1 sector assigned in session
  readonly assignedOperatorsInSession = computed(() => {
    const opIds = new Set<number>();
    this.sessionSectorAssignments().forEach((opId) => opIds.add(opId));
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

    return {
      fullyCompletedCommunities,
      partialCommunities,
      unassignedCommunities,
      totalSectors,
      totalAssignedSectors,
      pendingSectors: Math.max(0, totalSectors - totalAssignedSectors),
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

    this.comunidadesService.getAllComunidades(1, 200).subscribe({
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

  // Assign or toggle all available sectors in a community to current operator
  toggleAllSectorsInCommunity(comunidadId: number): void {
    const opId = this.selectedOperarioId();
    if (!opId) {
      this.toastService.show(
        'Por favor, seleccioná un operario en la Tabla 1 primero.',
        'warning',
      );
      return;
    }

    const communitySectors = this.getSectoresForComunidad(comunidadId);
    if (communitySectors.length === 0) return;

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
      // Unassign all my sectors in this community
      for (const s of availableSectors) {
        if (s.sectorId) currentMap.delete(s.sectorId);
      }
    } else {
      // Assign all available sectors to me
      for (const s of availableSectors) {
        if (s.sectorId) currentMap.set(s.sectorId, opId);
      }
    }

    this.sessionSectorAssignments.set(currentMap);
  }

  removeOperatorSector(sectorId: number): void {
    const currentMap = new Map(this.sessionSectorAssignments());
    currentMap.delete(sectorId);
    this.sessionSectorAssignments.set(currentMap);
  }

  clearOperatorSessionAssignments(operarioId: number): void {
    const currentMap = new Map(this.sessionSectorAssignments());
    currentMap.forEach((opId, sectorId) => {
      if (opId === operarioId) {
        currentMap.delete(sectorId);
      }
    });
    this.sessionSectorAssignments.set(currentMap);
  }

  // Navigation between Step 1 (2 Tables) and Step 2 (Full Width Summary)
  goToSummary(): void {
    if (this.totalSessionAssignedSectorsCount() === 0) {
      this.toastService.show(
        'No has asignado ningún sector en esta sesión todavía.',
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

    const assignedOperators = this.assignedOperatorsInSession();
    if (assignedOperators.length === 0) {
      this.toastService.show('No hay asignaciones para despachar.', 'warning');
      return;
    }

    const totalSectors = this.totalSessionAssignedSectorsCount();
    this.dialogService
      .confirm({
        title: 'Confirmar y Despachar Rutas',
        message: `¿Estás seguro de confirmar y generar las rutas de trabajo para ${assignedOperators.length} operario(s) con un total de ${totalSectors} sector(es) para el período ${period.nombre}?`,
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

    // Group session assignments by operarioId and then by comunidadId
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

    if (requests.length === 0) {
      this.isLoading.set(false);
      return;
    }

    // Dispatch all requests via forkJoin
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

