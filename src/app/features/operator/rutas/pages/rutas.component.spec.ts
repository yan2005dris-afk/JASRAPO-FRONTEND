import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { RutasComponent } from './rutas.component';
import { OperatorRouteOfflineService } from '../data/operator-route-offline.service';
import { IndexedDbService } from '../../../../core/services/indexed-db.service';
import { NetworkService } from '../../../../core/services/network.service';
import { OperatorSyncService } from '../../../../core/services/operator-sync.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { OperatorRouteResponse } from '../domain/operator.models';

const mockRoutesWithNames: OperatorRouteResponse[] = [
  {
    rutaId: '101',
    tipoRuta: 'LECTURA',
    nombre: 'Ruta Olón Norte',
    descripcion: 'Sector Norte Olón',
    estado: 'PENDIENTE',
    operarioId: 10,
    comunidadId: 1,
    comunidadNombre: 'Olón',
    sectorId: 1,
    sectorNombre: 'Sector Norte Olón',
    medidor: null,
    operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
    paradas: [],
    ordenesTrabajo: [],
  },
  {
    rutaId: '102',
    tipoRuta: 'RECONEXION',
    nombre: 'Ruta Reconexión Núñez',
    descripcion: 'Comunidad Núñez',
    estado: 'EN_PROGRESO',
    operarioId: 10,
    comunidadId: 2,
    comunidadNombre: 'Núñez',
    sectorId: undefined,
    sectorNombre: undefined,
    medidor: null,
    operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
    paradas: [],
    ordenesTrabajo: [],
  },
];

const mockRoutesWithoutNames: OperatorRouteResponse[] = [
  {
    rutaId: '103',
    tipoRuta: 'INSTALACION',
    nombre: 'Ruta Instalación',
    descripcion: '',
    estado: 'PENDIENTE',
    operarioId: 10,
    comunidadId: 1,
    sectorId: 2,
    medidor: null,
    operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
    paradas: [],
    ordenesTrabajo: [],
  },
];

describe('RutasComponent', () => {
  let fixture: ComponentFixture<RutasComponent>;
  let component: RutasComponent;
  let loadAssignedRoutes: ReturnType<typeof vi.fn>;
  let loadActivityTypes: ReturnType<typeof vi.fn>;
  let getComunidadesCache: ReturnType<typeof vi.fn>;
  let getSectoresCache: ReturnType<typeof vi.fn>;
  let saveComunidadesCache: ReturnType<typeof vi.fn>;
  let saveSectoresCache: ReturnType<typeof vi.fn>;
  let getMetersCache: ReturnType<typeof vi.fn>;
  let getRegisteredReadingsCache: ReturnType<typeof vi.fn>;
  let getPendingReadings: ReturnType<typeof vi.fn>;

  const connected$ = new Subject<boolean>();

  beforeEach(async () => {
    loadAssignedRoutes = vi.fn().mockResolvedValue({
      routes: mockRoutesWithNames,
      source: 'network',
      cachedAt: null,
    });
    loadActivityTypes = vi.fn().mockResolvedValue([
      { tipoActividadId: 1, codigo: 'LECTURA', nombre: 'Lecturas' },
      { tipoActividadId: 2, codigo: 'RECONEXION', nombre: 'Reconexión' },
    ]);
    getComunidadesCache = vi.fn().mockResolvedValue([
      { comunidadId: 1, nombre: 'Olón' },
      { comunidadId: 2, nombre: 'Núñez' },
    ]);
    getSectoresCache = vi.fn().mockResolvedValue([
      { sectorId: 1, comunidadId: 1, nombre: 'Sector Norte Olón' },
      { sectorId: 2, comunidadId: 1, nombre: 'Sector Sur Olón' },
    ]);
    saveComunidadesCache = vi.fn().mockResolvedValue(undefined);
    saveSectoresCache = vi.fn().mockResolvedValue(undefined);
    getMetersCache = vi.fn().mockResolvedValue([]);
    getRegisteredReadingsCache = vi.fn().mockResolvedValue([]);
    getPendingReadings = vi.fn().mockResolvedValue([]);
    const getSyncedReadings = vi.fn().mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [RutasComponent],
      providers: [
        provideRouter([]),
        {
          provide: OperatorRouteOfflineService,
          useValue: { loadAssignedRoutes, loadActivityTypes },
        },
        {
          provide: IndexedDbService,
          useValue: {
            getComunidadesCache,
            getSectoresCache,
            saveComunidadesCache,
            saveSectoresCache,
            getMetersCache,
            getRegisteredReadingsCache,
            getPendingReadings,
            getSyncedReadings,
          },
        },
        {
          provide: NetworkService,
          useValue: { connected$, isOnline: () => true },
        },
        {
          provide: OperatorSyncService,
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ id: 10, name: 'Carlos Mora', roleName: 'Operador' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RutasComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga y normaliza las rutas con nombres reales de comunidad y sector', async () => {
    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    const tasks = component.tasks();
    expect(tasks.length).toBe(2);
    expect(tasks[0].comunidadNombre).toBe('Olón');
    expect(tasks[0].sectorNombre).toBe('Sector Norte Olón');
    expect(tasks[1].comunidadNombre).toBe('Núñez');
  });

  it('resuelve nombres desde IndexedDB cuando las rutas no traen comunidadNombre ni sectorNombre', async () => {
    loadAssignedRoutes.mockResolvedValue({
      routes: mockRoutesWithoutNames,
      source: 'cache',
      cachedAt: '2026-09-23T10:00:00.000Z',
    });

    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    const tasks = component.tasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].comunidadNombre).toBe('Olón');
    expect(tasks[0].sectorNombre).toBe('Sector Sur Olón');
  });

  it('muestra los nombres literales de la respuesta y actualiza la caché si difieren', async () => {
    loadAssignedRoutes.mockResolvedValue({
      routes: [
        {
          ...mockRoutesWithNames[0],
          comunidadNombre: 'Olon',
          sectorNombre: 'Norte literal',
        },
      ],
      source: 'network',
      cachedAt: null,
    });

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.tasks()[0].comunidadNombre).toBe('Olon');
    expect(component.tasks()[0].sectorNombre).toBe('Norte literal');
    expect(component.availableComunidades()[0].label).toBe('Olon');
    component.setComunidadFilter('1');
    expect(component.routeGroups()[0].label).toBe('Norte literal');
    expect(saveComunidadesCache).toHaveBeenCalledWith([{ comunidadId: 1, nombre: 'Olon' }]);
    expect(saveSectoresCache).toHaveBeenCalledWith([
      { sectorId: 1, comunidadId: 1, nombre: 'Norte literal' },
    ]);
  });

  it('availableComunidades produce opciones con nombres reales y sin etiquetas genéricas', async () => {
    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    const comunidades = component.availableComunidades();
    expect(comunidades.length).toBe(2);
    expect(comunidades.map((c) => c.label)).toContain('Olón');
    expect(comunidades.map((c) => c.label)).toContain('Núñez');
    expect(comunidades.some((c) => c.label.includes('Comunidad #'))).toBe(false);
  });

  it('Olón muestra solo los sectores con rutas asignadas', async () => {
    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    component.setComunidadFilter('1');
    const sectors = component.routeGroups();
    expect(sectors.length).toBe(1);
    expect(sectors[0].label).toBe('Sector Norte Olón');
    expect(sectors[0].label?.includes('Sector #')).toBe(false);
  });

  it('muestra todas las rutas directamente y permite filtrar por chip de comunidad', async () => {
    component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todas las comunidades');
    expect(fixture.nativeElement.querySelectorAll('.task-card').length).toBe(2);

    component.setComunidadFilter('1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ruta Olón Norte');
    expect(component.routeGroups().map((sector) => sector.label)).toEqual(['Sector Norte Olón']);
    expect(fixture.nativeElement.textContent).not.toContain('Ruta Reconexión Núñez');
    expect(fixture.nativeElement.querySelectorAll('.route-sector-section').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.task-card').length).toBe(1);

    component.setComunidadFilter('ALL');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.task-card').length).toBe(2);
  });

  it('agrupa Olón por sector y presenta las demás comunidades sin sector artificial', async () => {
    component.ngOnInit();
    await fixture.whenStable();
    component.tasks.set([
      { ...mockRoutesWithNames[0], rutaId: '101', sectorId: 1, sectorNombre: 'Centro' },
      {
        ...mockRoutesWithNames[0],
        rutaId: '104',
        comunidadId: 1,
        sectorId: 3,
        sectorNombre: 'Centro',
      },
      {
        ...mockRoutesWithNames[0],
        rutaId: '105',
        comunidadId: 1,
        sectorId: undefined,
        sectorNombre: undefined,
      },
      {
        ...mockRoutesWithNames[1],
        rutaId: '106',
        comunidadId: 2,
        sectorId: 1,
        sectorNombre: 'Centro',
      },
    ]);

    component.setComunidadFilter('1');
    expect(component.routeGroups().map((sector) => sector.id)).toEqual(['1', '3', 'NONE']);
    expect(component.routeGroups().map((sector) => sector.label)).toEqual([
      'Centro',
      'Centro',
      'Sin Sector',
    ]);
    expect(
      component.routeGroups().map((sector) => sector.routes.map((route) => route.rutaId)),
    ).toEqual([['101'], ['104'], ['105']]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin Sector');
    expect(fixture.nativeElement.querySelectorAll('.route-sector-section').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.task-card').length).toBe(3);

    component.setComunidadFilter('2');
    expect(component.routeGroups().map((group) => group.id)).toEqual(['DIRECT']);
    expect(component.routeGroups()[0].label).toBeNull();
    expect(component.filteredTasks().map((route) => route.rutaId)).toEqual(['106']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.route-sector-heading').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.task-card').length).toBe(1);
  });

  it('respeta los nombres literales de la BD y el orden de los IDs del catálogo', async () => {
    component.ngOnInit();
    await fixture.whenStable();
    const olonRoute = mockRoutesWithNames[0];
    const otherRoute = mockRoutesWithNames[1];
    component.tasks.set([
      { ...olonRoute, comunidadNombre: 'Olon', sectorId: 1, rutaId: '101' },
      {
        ...olonRoute,
        comunidadNombre: 'Olon',
        sectorId: 2,
        sectorNombre: 'Sector Sur Olón',
        rutaId: '102',
      },
      {
        ...olonRoute,
        comunidadNombre: 'Olon',
        sectorId: 3,
        sectorNombre: 'Sector Centro Olón',
        rutaId: '103',
      },
      {
        ...olonRoute,
        comunidadNombre: 'Olon',
        sectorId: 4,
        sectorNombre: 'Sector Playa Olón',
        rutaId: '104',
      },
      { ...otherRoute, comunidadNombre: 'Nuñez', rutaId: '105' },
      { ...otherRoute, comunidadId: 3, comunidadNombre: 'La Entrada', rutaId: '106' },
      { ...otherRoute, comunidadId: 4, comunidadNombre: 'San Jose', rutaId: '107' },
      { ...otherRoute, comunidadId: 5, comunidadNombre: 'Curia', rutaId: '108' },
    ]);

    expect(component.availableComunidades().map((community) => community.label)).toEqual([
      'Olon',
      'Nuñez',
      'La Entrada',
      'San Jose',
      'Curia',
    ]);
    component.setComunidadFilter('1');
    expect(component.routeGroups().map((group) => group.label)).toEqual([
      'Sector Norte Olón',
      'Sector Sur Olón',
      'Sector Centro Olón',
      'Sector Playa Olón',
    ]);
    component.setComunidadFilter('4');
    expect(component.selectedComunidadLabel()).toBe('San Jose');
    expect(component.routeGroups().map((group) => group.label)).toEqual([null]);
  });

  it('aplica filtros globales antes del agrupamiento geográfico', async () => {
    component.ngOnInit();
    await fixture.whenStable();
    component.setFilter('RECONEXION');
    expect(component.availableComunidades().map((community) => community.label)).toEqual(['Núñez']);
    component.setComunidadFilter('2');
    expect(component.routeGroups().map((group) => group.label)).toEqual([null]);
    component.setStateFilter('PENDIENTE');
    expect(component.activeComunidadFilter()).toBe('2');
    expect(component.routeGroups()).toEqual([]);
    expect(component.selectedComunidadLabel()).toBe('Núñez');
    expect(component.availableComunidades()).toEqual([]);
  });

  it('getTaskComunidadDescription y getTaskSectorDescription retornan descripciones dinámicas', async () => {
    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    const task1 = component.tasks()[0];
    const task2 = component.tasks()[1];

    expect(component.getTaskComunidadDescription(task1)).toBe('Olón');
    expect(component.getTaskSectorDescription(task1)).toBe('Sector Norte Olón');
    expect(component.getTaskComunidadDescription(task2)).toBe('Núñez');
  });

  describe('resolveTaskTipoRuta y openRoute', () => {
    it('resolveTaskTipoRuta resuelve correctamente con fallback a órdenes de inspección', () => {
      const inspectionTask: OperatorRouteResponse = {
        rutaId: 'r-insp',
        tipoRuta: undefined as unknown as OperatorRouteResponse['tipoRuta'],
        nombre: 'Inspección GUIA-2005-05',
        estado: 'PENDIENTE',
        operarioId: 10,
        comunidadId: 1,
        medidor: null,
        operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
        ordenesTrabajo: [
          {
            ordenTrabajoId: 'ot-45',
            rutaId: 'r-insp',
            tipoActividad: 'INSPECCION',
            estado: 'PENDIENTE',
            ordenVisita: 1,
            contratoId: 'c-1',
            contrato: {
              numeroContrato: 'GUIA-2005-05',
              clienteNombre: 'MARLON BRANDO ZAMBRANO SAAVEDRA',
              direccion: 'Curia',
            },
          },
        ],
      };

      expect(component.resolveTaskTipoRuta(inspectionTask)).toBe('INSPECCION');
      expect(component.actionLabelFor(inspectionTask)).toBe('Inspección');
      expect(component.actionIconFor(inspectionTask)).toBe('bi-search');
    });

    it('openRoute maneja órdenes sin medidor instalado y genera identificadores para navegación', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      const inspectionTask: OperatorRouteResponse = {
        rutaId: 'r-insp-1',
        tipoRuta: 'INSPECCION',
        nombre: 'Inspección GUIA-2005-05',
        estado: 'PENDIENTE',
        operarioId: 10,
        comunidadId: 1,
        medidor: null,
        operario: { usuarioId: 10, nombres: 'Carlos', apellidos: 'Mora' },
        ordenesTrabajo: [
          {
            ordenTrabajoId: 'ot-45',
            rutaId: 'r-insp-1',
            tipoActividad: 'INSPECCION',
            estado: 'PENDIENTE',
            ordenVisita: 1,
            contratoId: 'c-1',
            contrato: {
              numeroContrato: 'GUIA-2005-05',
              clienteNombre: 'MARLON BRANDO ZAMBRANO SAAVEDRA',
              direccion: 'Curia',
            },
          },
        ],
      };

      component.openRoute(inspectionTask);

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/app/operador/lecturas'],
        expect.objectContaining({
          queryParams: expect.objectContaining({
            rutaId: 'r-insp-1',
            rutaNombre: 'Inspección GUIA-2005-05',
            rutaTipo: 'INSPECCION',
            series: 'GUIA-2005-05',
            serie: 'GUIA-2005-05',
            workOrders: 'GUIA-2005-05:INSPECCION:ot-45:PENDIENTE',
          }),
          state: { route: inspectionTask },
        }),
      );
    });
  });
});
