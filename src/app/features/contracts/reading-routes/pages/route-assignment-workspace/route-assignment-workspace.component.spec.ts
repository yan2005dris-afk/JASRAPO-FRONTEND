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
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';

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
    const sessionCommunityAssignments = signal(new Map<number, number>());
    const communityCurrentPage = signal<number>(1);
    const communityPageSize = signal<number>(4);
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

    const existingAssignedCommunityMap = computed(() => {
      const map = new Map<number, IReadingRoute>();
      for (const r of periodExistingRoutes()) {
        if (r.comunidadId != null && r.sectorId == null) {
          map.set(r.comunidadId, r);
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

    const totalSessionAssignedSectorsCount = computed(
      () => sessionSectorAssignments().size + sessionCommunityAssignments().size,
    );

    const assignedOperatorsInSession = computed(() => {
      const opIds = new Set<number>();
      sessionSectorAssignments().forEach((opId) => opIds.add(opId));
      sessionCommunityAssignments().forEach((opId) => opIds.add(opId));
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
      communityFilter: signal('all'),
      contractSearch: signal(''),
      sessionSectorAssignments,
      sessionCommunityAssignments,
      communityCurrentPage,
      communityPageSize,
      selectedContratoIds: signal([]),
      isLoading: signal(false),
      isLoadingContracts: signal(false),
      existingAssignedSectorMap,
      existingAssignedCommunityMap,
      existingCommunityRoutes,
      totalSessionAssignedSectorsCount,
      assignedOperatorsInSession,
      globalCoverageSummary,
      sugeridoNombreBase,
      nombreBase,
      communityTotalPages: computed(() => {
        const total = component.filteredComunidades().length;
        return Math.max(1, Math.ceil(total / component.communityPageSize()));
      }),
      paginatedComunidades: computed(() => {
        const list = component.filteredComunidades();
        const page = component.communityCurrentPage();
        const size = component.communityPageSize();
        const start = (page - 1) * size;
        return list.slice(start, start + size);
      }),
      communityPagesArray: computed(() => {
        const total = component.communityTotalPages();
        return Array.from({ length: total }, (_, i) => i + 1);
      }),
      filteredComunidades: computed(() => {
        const q = component.communitySearch().toLowerCase().trim();
        const filter = component.communityFilter();
        let list = component.comunidades();

        if (filter === 'completed') {
          list = list.filter((c) => c.id != null && component.isCommunityCompleted(c.id));
        } else if (filter === 'pending') {
          list = list.filter((c) => c.id != null && !component.isCommunityCompleted(c.id));
        }

        if (!q) return list;
        return list.filter((c) => {
          const matchName = c.nombre?.toLowerCase().includes(q);
          const matchCode = c.codigo?.toLowerCase().includes(q);
          const hasMatchingSector = component
            .sectores()
            .filter((s) => s.comunidadId === c.id)
            .some(
              (s) => s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q),
            );
          return matchName || matchCode || hasMatchingSector;
        });
      }),
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
    mockRoutesService.createAssignments.mockReturnValue(of([{ rutaId: 101, nombre: 'Ruta 1' }]));

    component.selectedPeriod.set({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    } as unknown as IAccountingPeriod);
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
    } as unknown as IAccountingPeriod);
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

  it('should filter communities by quick tabs (all, pending, completed)', () => {
    // Comuna 2 has Sector 20 in DB -> completed
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

    component.setCommunityFilter('completed');
    expect(component.communityFilter()).toBe('completed');
    expect(component.filteredComunidades().length).toBe(1);
    expect(component.filteredComunidades()[0].id).toBe(2);

    component.setCommunityFilter('pending');
    expect(component.communityFilter()).toBe('pending');
    expect(component.filteredComunidades().length).toBe(1);
    expect(component.filteredComunidades()[0].id).toBe(1);

    component.setCommunityFilter('all');
    expect(component.communityFilter()).toBe('all');
    expect(component.filteredComunidades().length).toBe(2);
  });

  it('should assign all available sectors across communities to active operator', () => {
    component.selectedOperarioId.set(5);
    // Sectores 10 and 11 in Comunidad 1, Sector 20 in Comunidad 2
    component.assignAllAvailable();

    expect(component.totalSessionAssignedSectorsCount()).toBe(3);
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('Se asignaron 3'),
      'success',
    );
  });

  it('should toggle direct community assignment for communities without sectors', () => {
    // Comunidad 3 has no sectors
    component.comunidades.set([
      ...mockComunidades,
      { id: 3, nombre: 'Curia', codigo: '003', porcentajeTasaSeguridad: 0 },
    ]);

    component.selectedOperarioId.set(5);
    component.toggleCommunityAssignment(3);

    expect(component.sessionCommunityAssignments().get(3)).toBe(5);
    expect(component.totalSessionAssignedSectorsCount()).toBe(1);

    // Toggle off
    component.toggleCommunityAssignment(3);
    expect(component.sessionCommunityAssignments().has(3)).toBe(false);
    expect(component.totalSessionAssignedSectorsCount()).toBe(0);
  });

  it('should paginate community cards correctly', () => {
    component.comunidades.set([
      { id: 1, nombre: 'Olon', codigo: '001', porcentajeTasaSeguridad: 5 },
      { id: 2, nombre: 'Nuñez', codigo: '002', porcentajeTasaSeguridad: 0 },
      { id: 3, nombre: 'La Entrada', codigo: '003', porcentajeTasaSeguridad: 3 },
      { id: 4, nombre: 'San Jose', codigo: '004', porcentajeTasaSeguridad: 2 },
      { id: 5, nombre: 'Curia', codigo: '005', porcentajeTasaSeguridad: 0 },
    ]);
    component.communityPageSize.set(2);

    expect(component.communityTotalPages()).toBe(3);
    expect(component.paginatedComunidades().length).toBe(2);
    expect(component.paginatedComunidades()[0].id).toBe(1);

    component.nextCommunityPage();
    expect(component.communityCurrentPage()).toBe(2);
    expect(component.paginatedComunidades()[0].id).toBe(3);

    component.prevCommunityPage();
    expect(component.communityCurrentPage()).toBe(1);

    component.setCommunityCurrentPage(3);
    expect(component.communityCurrentPage()).toBe(3);
    expect(component.paginatedComunidades().length).toBe(1);
    expect(component.paginatedComunidades()[0].id).toBe(5);
  });

  it('should reset session assignments when resetSessionAssignments is called', () => {
    component.selectedOperarioId.set(5);
    component.toggleSector(mockSectores[0]);
    expect(component.totalSessionAssignedSectorsCount()).toBe(1);

    component.resetSessionAssignments();
    expect(component.totalSessionAssignedSectorsCount()).toBe(0);
    expect(mockToastService.show).toHaveBeenCalledWith(
      'Se descartaron todas las asignaciones de la sesión.',
      'info',
    );
  });
});
