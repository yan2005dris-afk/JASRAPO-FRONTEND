import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import {
  RouteAssignmentWorkspaceComponent,
  OPERATOR_PALETTE,
} from './route-assignment-workspace.component';
import { User } from '../../../../users/models/user.interface';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { IReadingRoute } from '../../interfaces/ireading-route.interface';

describe('RouteAssignmentWorkspaceComponent (Issue #315)', () => {
  let component: RouteAssignmentWorkspaceComponent;

  const mockRouter = {
    navigate: vi.fn(),
  };

  const mockRoutesService = {
    getRoutes: vi.fn(),
    createAssignments: vi.fn(),
    getActivityTypes: vi.fn().mockReturnValue(of([])),
  };

  const mockComunidadesService = {
    getAllComunidades: vi.fn().mockReturnValue(of({ data: [] })),
  };

  const mockSectoresService = {
    getAllSectores: vi.fn().mockReturnValue(of({ data: [] })),
  };

  const mockUsersService = {
    getUsers: vi.fn().mockReturnValue(of({ data: [] })),
  };

  const mockContractsService = {
    getContracts: vi.fn().mockReturnValue(of({ data: [] })),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  const mockDialogService = {
    confirm: vi.fn().mockReturnValue(of(true)),
  };

  const mockOperarios: User[] = [
    {
      usuarioId: 5,
      nombres: 'Carlos',
      apellidos: 'Operador',
      email: 'carlos@test.com',
      rol: { rolId: 2, nombre: 'operadores' },
    } as unknown as User,
    {
      usuarioId: 7,
      nombres: 'Andres',
      apellidos: 'Rivas',
      email: 'andres@test.com',
      rol: { rolId: 2, nombre: 'operadores' },
    } as unknown as User,
  ];

  const mockComunidades: Comunidad[] = [
    { id: 1, nombre: 'Comuna Centro', codigo: 'CC-01' } as unknown as Comunidad,
    { id: 2, nombre: 'Comuna Norte', codigo: 'CN-02' } as unknown as Comunidad,
  ];

  const mockSectores: Sectores[] = [
    { sectorId: 10, comunidadId: 1, nombre: 'Sector A', codigo: 'SEC-10' },
    { sectorId: 11, comunidadId: 1, nombre: 'Sector B', codigo: 'SEC-11' },
    { sectorId: 20, comunidadId: 2, nombre: 'Sector Norte 1', codigo: 'SEC-20' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    component = Object.create(
      RouteAssignmentWorkspaceComponent.prototype,
    ) as RouteAssignmentWorkspaceComponent;

    const periodExistingRoutes = signal<IReadingRoute[]>([]);
    const sessionSectorAssignments = signal(new Map<number, number>());
    const operarios = signal(mockOperarios);
    const comunidades = signal(mockComunidades);
    const sectores = signal(mockSectores);
    const selectedOperarioId = signal<number | null>(5);

    const existingAssignedSectorMap = computed(() => {
      const map = new Map<number, IReadingRoute>();
      for (const r of periodExistingRoutes()) {
        if (r.sectorId != null) {
          map.set(r.sectorId, r);
        }
      }
      return map;
    });

    const existingCommunityRoutes = computed(() => {
      const map = new Map<number, IReadingRoute[]>();
      for (const r of periodExistingRoutes()) {
        if (r.comunidadId != null) {
          const list = map.get(r.comunidadId) || [];
          list.push(r);
          map.set(r.comunidadId, list);
        }
      }
      return map;
    });

    const totalSessionAssignedSectorsCount = computed(() => sessionSectorAssignments().size);

    const assignedOperatorsInSession = computed(() => {
      const opIds = new Set<number>();
      sessionSectorAssignments().forEach((opId) => opIds.add(opId));
      return operarios().filter((op) => opIds.has(op.usuarioId));
    });

    const globalCoverageSummary = computed(() => {
      const allComunidades = comunidades();
      let fullyCompletedCommunities = 0;
      let partialCommunities = 0;
      let unassignedCommunities = 0;
      let totalSectorsCount = 0;
      let totalAssignedSectors = 0;

      for (const c of allComunidades) {
        if (c.id == null) continue;
        const { assigned, total } = component.getCommunityAssignedCount(c.id);
        totalSectorsCount += total;
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
        totalSectors: totalSectorsCount,
        totalAssignedSectors,
        pendingSectors: Math.max(0, totalSectorsCount - totalAssignedSectors),
      };
    });

    const sugeridoNombreBase = computed(() => 'Ruta Lectura - 2026');
    const nombreBase = computed(() => 'Ruta Lectura - 2026');

    Object.assign(component as object, {
      router: mockRouter,
      routesService: mockRoutesService,
      comunidadesService: mockComunidadesService,
      sectoresService: mockSectoresService,
      usersService: mockUsersService,
      contractsService: mockContractsService,
      toastService: mockToastService,
      dialogService: mockDialogService,
      currentStep: signal(1),
      operarios,
      comunidades,
      sectores,
      contratos: signal([]),
      tiposActividad: signal([]),
      periodExistingRoutes,
      isLoadingRoutes: signal(false),
      selectedPeriod: signal(null),
      selectedPeriodId: signal(null),
      selectedOperarioId,
      selectedComunidadId: signal(null),
      tipoActividadSeleccionada: signal('LECTURA'),
      fechaPlanificada: signal('2026-09'),
      customNombreBase: signal(null),
      workerSearch: signal(''),
      communitySearch: signal(''),
      contractSearch: signal(''),
      sessionSectorAssignments,
      selectedContratoIds: signal([]),
      isLoading: signal(false),
      isLoadingContracts: signal(false),
      existingAssignedSectorMap,
      existingCommunityRoutes,
      totalSessionAssignedSectorsCount,
      assignedOperatorsInSession,
      globalCoverageSummary,
      sugeridoNombreBase,
      nombreBase,
    });
  });

  it('should assign distinctive colors from palette to each operator', () => {
    const colorOp1 = component.getOperatorColor(5);
    const colorOp2 = component.getOperatorColor(7);

    expect(colorOp1).toBeDefined();
    expect(colorOp2).toBeDefined();
    expect(colorOp1.id).toBe(OPERATOR_PALETTE[0].id);
    expect(colorOp2.id).toBe(OPERATOR_PALETTE[1].id);
  });

  it('should identify already assigned sectors in database and return correct status', () => {
    component.periodExistingRoutes.set([
      {
        rutaId: 99,
        nombre: 'Ruta Previa - Sector Norte 1',
        operarioId: 5,
        comunidadId: 2,
        sectorId: 20,
        periodoId: 1,
        estado: 'PENDIENTE',
      } as unknown as IReadingRoute,
    ]);

    const statusSec20 = component.getSectorStatus(20);
    expect(statusSec20.isAssigned).toBe(true);
    expect(statusSec20.isDbAssigned).toBe(true);
    expect(statusSec20.operarioId).toBe(5);

    const statusSec10 = component.getSectorStatus(10);
    expect(statusSec10.isAssigned).toBe(false);
    expect(statusSec10.isDbAssigned).toBe(false);
  });

  it('should detect 100% completed community and mark yellow border status', () => {
    // Comuna 2 has only Sector 20, which is in DB
    component.periodExistingRoutes.set([
      {
        rutaId: 99,
        nombre: 'Ruta Previa',
        operarioId: 5,
        comunidadId: 2,
        sectorId: 20,
        periodoId: 1,
        estado: 'PENDIENTE',
      } as unknown as IReadingRoute,
    ]);

    expect(component.isCommunityCompleted(2)).toBe(true);
    expect(component.isCommunityCompleted(1)).toBe(false);

    // Assign Sector 10 and Sector 11 in session
    component.toggleSector(mockSectores[0]); // Sector 10
    expect(component.isCommunityCompleted(1)).toBe(false);

    component.toggleSector(mockSectores[1]); // Sector 11
    expect(component.isCommunityCompleted(1)).toBe(true);
  });

  it('should enforce dynamic exclusion in session between operators', () => {
    // Assign Sector 10 to Carlos (opId 5)
    component.selectedOperarioId.set(5);
    component.toggleSector(mockSectores[0]);
    expect(component.sessionSectorAssignments().get(10)).toBe(5);

    // Switch to Andres (opId 7)
    component.selectedOperarioId.set(7);
    const status = component.getSectorStatus(10);
    expect(status.isAssigned).toBe(true);
    expect(status.operarioId).toBe(5);

    // Andres clicks Sector 10 => blocked with warning toast
    component.toggleSector(mockSectores[0]);
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('ya está asignado a Carlos Operador en esta sesión'),
      'warning',
    );
    expect(component.sessionSectorAssignments().get(10)).toBe(5);

    // Andres assigns Sector 11
    component.toggleSector(mockSectores[1]);
    expect(component.sessionSectorAssignments().get(11)).toBe(7);
    expect(component.totalSessionAssignedSectorsCount()).toBe(2);
  });

  it('should toggle all available sectors in a community to current operator', () => {
    component.selectedOperarioId.set(5);

    // Assign all available sectors of Comuna 1 to Carlos
    component.toggleAllSectorsInCommunity(1);
    expect(component.sessionSectorAssignments().get(10)).toBe(5);
    expect(component.sessionSectorAssignments().get(11)).toBe(5);

    // Toggle again unassigns all of Carlos
    component.toggleAllSectorsInCommunity(1);
    expect(component.sessionSectorAssignments().has(10)).toBe(false);
    expect(component.sessionSectorAssignments().has(11)).toBe(false);
  });

  it('should navigate between Step 1 and Step 2 (Summary) and compute metrics', () => {
    component.selectedOperarioId.set(5);
    component.toggleSector(mockSectores[0]); // Sector 10

    component.goToSummary();
    expect(component.currentStep()).toBe(2);

    const summary = component.globalCoverageSummary();
    expect(summary.totalAssignedSectors).toBe(1);
    expect(summary.pendingSectors).toBe(2);

    component.backToAssignment();
    expect(component.currentStep()).toBe(1);
  });

  it('should execute batch dispatch when confirmed in Step 3', () => {
    mockRoutesService.createAssignments.mockReturnValue(
      of([{ rutaId: 101, nombre: 'Ruta 1' }]),
    );

    component.selectedPeriod.set({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    } as any);
    component.selectedPeriodId.set(1);

    component.selectedOperarioId.set(5);
    component.toggleSector(mockSectores[0]); // Sector 10
    component.selectedOperarioId.set(7);
    component.toggleSector(mockSectores[1]); // Sector 11

    component.goToSummary();
    component.confirmAndDispatchAll();

    expect(mockDialogService.confirm).toHaveBeenCalled();
    expect(mockRoutesService.createAssignments).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/Contratos/RutasDeLectura']);
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('¡Rutas despachadas con éxito!'),
      'success',
    );
  });

  it('should handle error when batch dispatch fails', () => {
    mockRoutesService.createAssignments.mockReturnValue(
      throwError(() => ({ error: { message: 'Error en base de datos' } })),
    );

    component.selectedPeriod.set({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    } as any);
    component.selectedPeriodId.set(1);

    component.selectedOperarioId.set(5);
    component.toggleSector(mockSectores[0]);

    component.executeBatchAssignments();

    expect(component.isLoading()).toBe(false);
    expect(mockToastService.show).toHaveBeenCalledWith('Error en base de datos', 'error');
  });

  it('should navigate back on goBack()', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/Contratos/RutasDeLectura']);
  });
});
