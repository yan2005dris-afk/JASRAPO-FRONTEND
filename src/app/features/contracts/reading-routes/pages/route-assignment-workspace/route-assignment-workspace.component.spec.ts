import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RouteAssignmentWorkspaceComponent } from './route-assignment-workspace.component';
import { OPERATOR_PALETTE } from '../../../../../shared/types/operator-color';
import { User } from '../../../../users/models/user.interface';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { IReadingRoute } from '../../domain/models/reading-route.model';
import { IContract } from '../../../service-contracts/domain/models/service-contract.model';
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

  const mockContractsApi = {
    getContracts: vi.fn().mockReturnValue(of({ data: [] })),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  const mockDialogService = {
    confirm: vi.fn().mockReturnValue(of(true)),
  };

  const mockOpenPeriod: IAccountingPeriod = {
    periodoId: 1,
    nombre: 'Enero 2026',
    estado: 'ABIERTO',
  };

  const mockPeriodsService = {
    getPeriods: vi.fn().mockReturnValue(of([mockOpenPeriod])),
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

  const buildContrato = (id: string, comunidadId: number, guia: string): IContract =>
    ({
      contratoId: id,
      comunidadId,
      numeroGuia: guia,
      direccionSuministro: `Calle ${guia} ${id}`,
      cliente: {
        clienteId: `cli-${id}`,
        identificacion: `09${id}`,
        nombres: 'Juan',
        apellidos: `Pérez ${id}`,
        razonSocial: null,
        email: null,
        telefono: null,
        direccionDomicilio: null,
      },
      sector: { sectorId: 100 + Number(id), codigo: `SEC-${id}`, nombre: 'Centro' },
      comunidad: { comunidadId, codigo: 'CC', nombre: 'Centro' },
      categoriaTarifaId: 1,
      categoriaTarifa: {} as never,
      historialMedidores: [],
      clienteId: `cli-${id}`,
      fechaInicio: '2024-01-01',
      estadoServicio: 'ACTIVO',
    }) as unknown as IContract;

  const mockContratos: IContract[] = [
    buildContrato('100', 1, 'G-001'),
    buildContrato('101', 1, 'G-002'),
    buildContrato('102', 1, 'G-003'),
    buildContrato('200', 2, 'G-101'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    component = Object.create(
      RouteAssignmentWorkspaceComponent.prototype,
    ) as RouteAssignmentWorkspaceComponent;

    const periodExistingRoutes = signal<IReadingRoute[]>([]);
    const sessionSectorAssignments = signal(new Map<number, number>());
    const sessionCommunityAssignments = signal(new Map<number, number>());
    const sessionContractAssignments = signal(new Map<number, number>());
    const communityCurrentPage = signal<number>(1);
    const communityPageSize = signal<number>(4);
    const operarios = signal(mockOperarios);
    const comunidades = signal(mockComunidades);
    const sectores = signal(mockSectores);
    const contratos = signal<IContract[]>(mockContratos);
    const selectedOperarioId = signal<number | null>(5);
    const selectedComunidadId = signal<number | null>(null);
    const contractCurrentPage = signal<number>(1);
    const contractPageSize = signal<number>(50);
    const contractTotalPages = signal<number>(1);
    const contractTotalEnComunidad = signal<number>(0);

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
      contractsService: mockContractsApi,
      toastService: mockToastService,
      dialogService: mockDialogService,
      periodsService: mockPeriodsService,
      currentStep: signal(1),
      operarios,
      comunidades,
      sectores,
      contratos,
      tiposActividad: signal([
        { tipoActividadId: 1, codigo: 'LECTURA', nombre: 'Lectura', activo: true },
        { tipoActividadId: 2, codigo: 'INSTALACION', nombre: 'Instalación', activo: true },
        { tipoActividadId: 3, codigo: 'INSPECCION', nombre: 'Inspección', activo: true },
      ]),
      periodExistingRoutes,
      isLoadingRoutes: signal(false),
      selectedPeriod: signal(mockOpenPeriod),
      selectedPeriodId: signal(1),
      selectedOperarioId,
      selectedComunidadId,
      tipoActividadSeleccionada: signal('LECTURA'),
      customNombreBase: signal(null),
      workerSearch: signal(''),
      communitySearch: signal(''),
      communityFilter: signal('all'),
      contractSearch: signal(''),
      contractSearchDebounce: null,
      sessionSectorAssignments,
      sessionCommunityAssignments,
      sessionContractAssignments,
      communityCurrentPage,
      communityPageSize,
      contractCurrentPage,
      contractPageSize,
      contractTotalPages,
      contractTotalEnComunidad,
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
      isLecturaMode: computed(() =>
        component.isLecturaActivity(component.tipoActividadSeleccionada()),
      ),
      totalSessionAssignedContractsCount: computed(
        () => component.sessionContractAssignments().size,
      ),
      assignedOperatorsInContractSession: computed(() => {
        const opIds = new Set<number>();
        component.sessionContractAssignments().forEach((opId) => opIds.add(opId));
        return component.operarios().filter((op) => opIds.has(op.usuarioId));
      }),
      nonLecturaCoverageSummary: computed(() => {
        const assignedIds = new Set(component.sessionContractAssignments().keys());
        const totalContratosEnComunidad = component.contractTotalEnComunidad();
        const assignedContratosCount = assignedIds.size;
        const assignedComunidades = new Set<number>();
        component.sessionContractAssignments().forEach((_opId, contratoId) => {
          const c = component.contratos().find((x) => Number(x.contratoId) === contratoId);
          if (c) assignedComunidades.add(c.comunidadId);
        });
        return {
          totalContratosEnComunidad,
          assignedContratosCount,
          pendingContratos: Math.max(0, totalContratosEnComunidad - assignedContratosCount),
          comunidadesConContratos: assignedComunidades.size,
        };
      }),
      paginatedContratos: computed(() => {
        const all = component.contratos();
        const page = component.contractCurrentPage();
        const size = component.contractPageSize();
        const start = (page - 1) * size;
        return all.slice(start, start + size);
      }),
      contractPagesArray: computed(() => {
        const total = component.contractTotalPages();
        return Array.from({ length: total }, (_, i) => i + 1);
      }),
      filteredContratos: computed(() => component.paginatedContratos()),
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

  // ===========================================================================
  // Issue #141 — Restore activity type selector and contract selection
  // ===========================================================================

  describe('Issue #141 — Activity type selector and contract selection', () => {
    describe('isLecturaActivity()', () => {
      it('should classify LECTURA as lectura mode', () => {
        expect(component.isLecturaActivity('LECTURA')).toBe(true);
      });

      it('should classify legacy TOMA_LECTURA as lectura mode', () => {
        expect(component.isLecturaActivity('TOMA_LECTURA')).toBe(true);
      });

      it('should classify null/undefined as lectura mode (default)', () => {
        expect(component.isLecturaActivity(null)).toBe(true);
        expect(component.isLecturaActivity(undefined as unknown as null)).toBe(true);
      });

      it('should classify INSTALACION as non-lectura mode', () => {
        expect(component.isLecturaActivity('INSTALACION')).toBe(false);
      });

      it('should classify INSPECCION as non-lectura mode', () => {
        expect(component.isLecturaActivity('INSPECCION')).toBe(false);
      });

      it('should classify RECONEXION as non-lectura mode', () => {
        expect(component.isLecturaActivity('RECONEXION')).toBe(false);
      });
    });

    describe('onTipoActividadChange()', () => {
      it('should switch to INSTALACION and reset contract state', () => {
        // Pre-populate session state
        component.sessionContractAssignments.set(new Map([[100, 5]]));
        component.contratos.set(mockContratos);
        component.contractSearch.set('algo');
        component.selectedComunidadId.set(1);

        component.onTipoActividadChange('INSTALACION');

        expect(component.tipoActividadSeleccionada()).toBe('INSTALACION');
        expect(component.isLecturaMode()).toBe(false);
        expect(component.sessionContractAssignments().size).toBe(0);
        expect(component.contratos().length).toBe(0);
        expect(component.contractSearch()).toBe('');
        expect(component.selectedComunidadId()).toBe(null);
        expect(component.contractCurrentPage()).toBe(1);
        expect(component.contractTotalEnComunidad()).toBe(0);
      });

      it('should reset sector/community assignments when switching FROM lectura TO non-lectura', () => {
        component.sessionSectorAssignments.set(new Map([[10, 5]]));
        component.sessionCommunityAssignments.set(new Map([[2, 7]]));

        component.onTipoActividadChange('INSTALACION');

        expect(component.sessionSectorAssignments().size).toBe(0);
        expect(component.sessionCommunityAssignments().size).toBe(0);
      });

      it('should NOT reset sector/community assignments when switching BACK to lectura', () => {
        component.tipoActividadSeleccionada.set('INSTALACION');
        component.sessionSectorAssignments.set(new Map([[10, 5]]));
        component.sessionCommunityAssignments.set(new Map([[2, 7]]));

        component.onTipoActividadChange('LECTURA');

        expect(component.tipoActividadSeleccionada()).toBe('LECTURA');
        expect(component.sessionSectorAssignments().get(10)).toBe(5);
        expect(component.sessionCommunityAssignments().get(2)).toBe(7);
      });
    });

    describe('loadContractsForCommunity()', () => {
      it('should call backend with page=1, limit=100 and estadoServicio=ACTIVO', () => {
        mockContractsApi.getContracts.mockReturnValue(
          of({
            data: [mockContratos[0]],
            meta: {
              total: 1,
              page: 1,
              limit: 100,
              ultimaPagina: 1,
              paginaActual: 1,
              porPagina: 100,
              anterior: null,
              siguiente: null,
            },
          }),
        );

        component.loadContractsForCommunity(1);

        expect(mockContractsApi.getContracts).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            limit: 100,
            estadoServicio: 'ACTIVO',
          }),
        );
      });

      it('should filter client-side by comunidadId and set pagination meta', () => {
        mockContractsApi.getContracts.mockReturnValue(
          of({
            data: mockContratos, // includes both comunidad 1 and comunidad 2 contracts
            meta: {
              total: 4,
              page: 1,
              limit: 100,
              ultimaPagina: 1,
              paginaActual: 1,
              porPagina: 100,
              anterior: null,
              siguiente: null,
            },
          }),
        );
        component.contractPageSize.set(2);

        component.loadContractsForCommunity(1);

        expect(component.contratos().length).toBe(3); // 3 contracts belong to comunidad 1
        expect(component.contratos().every((c) => c.comunidadId === 1)).toBe(true);
        expect(component.contractTotalEnComunidad()).toBe(3);
        expect(component.contractTotalPages()).toBe(2); // 3 / 2 = 2 pages
        expect(component.isLoadingContracts()).toBe(false);
      });

      it('should iterate remaining backend pages when ultimaPagina > 1', () => {
        const page1Response = {
          data: [mockContratos[0]],
          meta: {
            total: 4,
            page: 1,
            limit: 100,
            ultimaPagina: 3,
            paginaActual: 1,
            porPagina: 100,
            anterior: null,
            siguiente: 2,
          },
        };
        const page2Response = {
          data: [mockContratos[1], mockContratos[2]],
          meta: {
            total: 4,
            page: 2,
            limit: 100,
            ultimaPagina: 3,
            paginaActual: 2,
            porPagina: 100,
            anterior: 1,
            siguiente: 3,
          },
        };
        const page3Response = {
          data: [mockContratos[3]],
          meta: {
            total: 4,
            page: 3,
            limit: 100,
            ultimaPagina: 3,
            paginaActual: 3,
            porPagina: 100,
            anterior: 2,
            siguiente: null,
          },
        };

        mockContractsApi.getContracts
          .mockReturnValueOnce(of(page1Response))
          .mockReturnValueOnce(of(page2Response))
          .mockReturnValueOnce(of(page3Response));

        component.loadContractsForCommunity(1);

        expect(mockContractsApi.getContracts).toHaveBeenCalledTimes(3);
        expect(mockContractsApi.getContracts.mock.calls[0][0]).toMatchObject({ page: 1 });
        expect(mockContractsApi.getContracts.mock.calls[1][0]).toMatchObject({ page: 2 });
        expect(mockContractsApi.getContracts.mock.calls[2][0]).toMatchObject({ page: 3 });
        // Filter comunidad 1: should have 3 contracts (IDs 100, 101, 102)
        expect(component.contratos().length).toBe(3);
      });

      it('should reset contractCurrentPage to 1 when loading a new community', () => {
        component.contractCurrentPage.set(5);
        mockContractsApi.getContracts.mockReturnValue(
          of({
            data: [mockContratos[0]],
            meta: {
              total: 1,
              page: 1,
              limit: 100,
              ultimaPagina: 1,
              paginaActual: 1,
              porPagina: 100,
              anterior: null,
              siguiente: null,
            },
          }),
        );

        component.loadContractsForCommunity(1);

        expect(component.contractCurrentPage()).toBe(1);
      });

      it('should show error toast when backend fails', () => {
        mockContractsApi.getContracts.mockReturnValue(throwError(() => new Error('network error')));

        component.loadContractsForCommunity(1);

        expect(component.contratos().length).toBe(0);
        expect(component.isLoadingContracts()).toBe(false);
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('Error al cargar contratos'),
          'error',
        );
      });
    });

    describe('toggleContrato()', () => {
      it('should warn when no operator is selected', () => {
        component.selectedOperarioId.set(null);
        component.toggleContrato(100);
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('seleccioná un operario'),
          'warning',
        );
      });

      it('should warn when period is not ABIERTO', () => {
        component.selectedPeriod.set({ ...mockOpenPeriod, estado: 'CERRADO' } as IAccountingPeriod);
        component.toggleContrato(100);
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('período operativo no está abierto'),
          'warning',
        );
        // Reset for other tests
        component.selectedPeriod.set(mockOpenPeriod);
      });

      it('should assign a contract to the active operator', () => {
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        expect(component.sessionContractAssignments().get(100)).toBe(5);
      });

      it('should toggle off a contract already assigned to the active operator', () => {
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        expect(component.sessionContractAssignments().get(100)).toBe(5);

        component.toggleContrato(100);
        expect(component.sessionContractAssignments().has(100)).toBe(false);
      });

      it('should block reassignment to another operator with warning', () => {
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        expect(component.sessionContractAssignments().get(100)).toBe(5);

        component.selectedOperarioId.set(7);
        component.toggleContrato(100);

        expect(component.sessionContractAssignments().get(100)).toBe(5); // unchanged
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('ya está asignado a Carlos Operador'),
          'warning',
        );
      });
    });

    describe('toggleAllFilteredContracts()', () => {
      beforeEach(() => {
        // Set contratos and pagination so visible contracts are mockContratos[0..2] (comunidad 1)
        component.contratos.set(mockContratos);
        component.contractPageSize.set(50);
        component.contractCurrentPage.set(1);
        component.contractTotalEnComunidad.set(4);
        component.contractTotalPages.set(1);
      });

      it('should warn when no operator is selected', () => {
        component.selectedOperarioId.set(null);
        component.toggleAllFilteredContracts();
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('seleccioná un operario'),
          'warning',
        );
      });

      it('should assign all visible contracts to the active operator', () => {
        component.selectedOperarioId.set(5);
        component.toggleAllFilteredContracts();

        expect(component.sessionContractAssignments().size).toBe(4);
        component.sessionContractAssignments().forEach((opId) => {
          expect(opId).toBe(5);
        });
      });

      it('should unassign all visible contracts when called twice', () => {
        component.selectedOperarioId.set(5);
        component.toggleAllFilteredContracts();
        expect(component.sessionContractAssignments().size).toBe(4);

        component.toggleAllFilteredContracts();
        expect(component.sessionContractAssignments().size).toBe(0);
      });
    });

    describe('getContratoStatus()', () => {
      it('should return unassigned status when contract has no session assignment', () => {
        const status = component.getContratoStatus(100);
        expect(status.isAssigned).toBe(false);
        expect(status.isCurrentOperator).toBe(false);
        expect(status.operarioId).toBeUndefined();
      });

      it('should mark as current-operator when assigned to selected operator', () => {
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);

        const status = component.getContratoStatus(100);
        expect(status.isAssigned).toBe(true);
        expect(status.isCurrentOperator).toBe(true);
        expect(status.operarioId).toBe(5);
        expect(status.operarioName).toBe('Carlos Operador');
      });

      it('should mark as other-operator when assigned to a different operator', () => {
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);

        component.selectedOperarioId.set(7);
        const status = component.getContratoStatus(100);
        expect(status.isAssigned).toBe(true);
        expect(status.isCurrentOperator).toBe(false);
        expect(status.operarioId).toBe(5);
      });
    });

    describe('getOperatorSessionContracts() and getOperatorSessionContractsCount()', () => {
      it('should return 0 count when operator has no assigned contracts', () => {
        expect(component.getOperatorSessionContractsCount(5)).toBe(0);
        expect(component.getOperatorSessionContracts(5)).toEqual([]);
      });

      it('should return the count and contracts assigned to an operator', () => {
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);
        component.toggleContrato(101);

        expect(component.getOperatorSessionContractsCount(5)).toBe(2);
        const assigned = component.getOperatorSessionContracts(5);
        expect(assigned.length).toBe(2);
        expect(assigned.map((c) => c.contratoId)).toEqual(expect.arrayContaining(['100', '101']));
      });

      it('should not include contracts assigned to a different operator', () => {
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);
        component.toggleContrato(101);

        expect(component.getOperatorSessionContractsCount(7)).toBe(0);
        expect(component.getOperatorSessionContracts(7)).toEqual([]);
      });
    });

    describe('removeOperatorContract()', () => {
      it('should remove a specific contract from session assignments', () => {
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);
        component.toggleContrato(101);
        expect(component.sessionContractAssignments().size).toBe(2);

        component.removeOperatorContract(100);

        expect(component.sessionContractAssignments().has(100)).toBe(false);
        expect(component.sessionContractAssignments().has(101)).toBe(true);
      });

      it('should be a no-op when contract was not assigned', () => {
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);

        component.removeOperatorContract(999);

        expect(component.sessionContractAssignments().size).toBe(1);
      });
    });

    describe('clearOperatorContractAssignments()', () => {
      it('should remove only the contracts of the specified operator', () => {
        component.contratos.set(mockContratos);
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        component.toggleContrato(101);

        component.selectedOperarioId.set(7);
        component.toggleContrato(200);

        component.clearOperatorContractAssignments(5);

        expect(component.sessionContractAssignments().get(100)).toBeUndefined();
        expect(component.sessionContractAssignments().get(101)).toBeUndefined();
        expect(component.sessionContractAssignments().get(200)).toBe(7);
      });
    });

    describe('resetSessionAssignments() (non-lectura)', () => {
      it('should also clear contract assignments', () => {
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);
        component.toggleContrato(101);
        expect(component.sessionContractAssignments().size).toBe(2);

        component.resetSessionAssignments();

        expect(component.sessionContractAssignments().size).toBe(0);
      });
    });

    describe('executeBatchAssignments() in non-lectura mode', () => {
      it('should send DTO with contratoIds (not sectorIds) when in non-lectura mode', () => {
        mockRoutesService.createAssignments.mockReturnValue(of([{ rutaId: 501 } as IReadingRoute]));

        component.tipoActividadSeleccionada.set('INSTALACION');
        component.selectedPeriodId.set(1);
        component.contratos.set(mockContratos);
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        component.toggleContrato(101);
        component.selectedOperarioId.set(7);
        component.toggleContrato(200);

        component.executeBatchAssignments();

        expect(mockRoutesService.createAssignments).toHaveBeenCalledTimes(2);

        const calls = mockRoutesService.createAssignments.mock.calls.map((c) => c[0]);
        const op5Call = calls.find((dto) => dto.operarioId === 5);
        const op7Call = calls.find((dto) => dto.operarioId === 7);

        expect(op5Call).toBeDefined();
        expect(op5Call!.tipoRuta).toBe('INSTALACION');
        expect(op5Call!.contratoIds).toEqual(expect.arrayContaining([100, 101]));
        expect(op5Call!.contratoIds).not.toContain(200);

        expect(op7Call).toBeDefined();
        expect(op7Call!.tipoRuta).toBe('INSTALACION');
        expect(op7Call!.contratoIds).toEqual([200]);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/Contratos/RutasDeLectura']);
      });

      it('should skip operators with no contracts when dispatching in non-lectura', () => {
        mockRoutesService.createAssignments.mockReturnValue(of([{ rutaId: 1 } as IReadingRoute]));

        component.tipoActividadSeleccionada.set('INSPECCION');
        component.selectedPeriodId.set(1);
        component.contratos.set(mockContratos);
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);

        component.executeBatchAssignments();

        expect(mockRoutesService.createAssignments).toHaveBeenCalledTimes(1);
        expect(mockRoutesService.createAssignments.mock.calls[0][0].tipoRuta).toBe('INSPECCION');
      });
    });

    describe('goToSummary() in non-lectura mode', () => {
      it('should not allow advancing when no contracts are assigned', () => {
        component.tipoActividadSeleccionada.set('INSTALACION');
        component.goToSummary();
        expect(component.currentStep()).toBe(1);
        expect(mockToastService.show).toHaveBeenCalledWith(
          expect.stringContaining('No has asignado ningún contrato'),
          'warning',
        );
      });

      it('should advance to Step 2 when at least one contract is assigned', () => {
        component.tipoActividadSeleccionada.set('INSTALACION');
        component.selectedOperarioId.set(5);
        component.contratos.set(mockContratos);
        component.toggleContrato(100);

        component.goToSummary();

        expect(component.currentStep()).toBe(2);
      });
    });

    describe('nonLecturaCoverageSummary()', () => {
      it('should compute correct counts based on session assignments', () => {
        component.contractTotalEnComunidad.set(10);
        component.contratos.set(mockContratos);
        component.selectedOperarioId.set(5);
        component.toggleContrato(100);
        component.toggleContrato(101);
        // 2 assigned out of 10 total → 8 pending
        const summary = component.nonLecturaCoverageSummary();
        expect(summary.assignedContratosCount).toBe(2);
        expect(summary.pendingContratos).toBe(8);
        expect(summary.comunidadesConContratos).toBe(1);
        expect(summary.totalContratosEnComunidad).toBe(10);
      });

      it('should handle zero community total gracefully', () => {
        component.contractTotalEnComunidad.set(0);
        const summary = component.nonLecturaCoverageSummary();
        expect(summary.assignedContratosCount).toBe(0);
        expect(summary.pendingContratos).toBe(0);
      });
    });

    describe('paginatedContratos() visible pagination', () => {
      it('should slice contratos by current page and page size', () => {
        const many: IContract[] = Array.from({ length: 120 }, (_, i) =>
          buildContrato(String(1000 + i), 1, `G-${i}`),
        );
        component.contratos.set(many);
        component.contractPageSize.set(50);
        component.contractCurrentPage.set(1);

        expect(component.paginatedContratos().length).toBe(50);

        component.contractCurrentPage.set(2);
        expect(component.paginatedContratos().length).toBe(50);

        component.contractCurrentPage.set(3);
        expect(component.paginatedContratos().length).toBe(20);
      });

      it('should clamp page navigation to valid range', () => {
        component.contractTotalPages.set(3);
        component.contractCurrentPage.set(1);

        component.prevContractPage();
        expect(component.contractCurrentPage()).toBe(1);

        component.nextContractPage();
        component.nextContractPage();
        component.nextContractPage();
        expect(component.contractCurrentPage()).toBe(3);

        component.setContractCurrentPage(99);
        expect(component.contractCurrentPage()).toBe(3);

        component.setContractCurrentPage(2);
        expect(component.contractCurrentPage()).toBe(2);
      });
    });
  });
});
