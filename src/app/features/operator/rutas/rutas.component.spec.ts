import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { RutasComponent } from './rutas.component';
import { OperatorRouteOfflineService } from '../service/operator-route-offline.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import type { OperatorRouteResponse } from '../models/operator.models';

const mockRoutesWithNames: OperatorRouteResponse[] = [
  {
    rutaId: '101',
    tipoRuta: 'TOMA_LECTURA',
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

    await TestBed.configureTestingModule({
      imports: [RutasComponent],
      providers: [
        provideRouter([]),
        {
          provide: OperatorRouteOfflineService,
          useValue: { loadAssignedRoutes },
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

  it('availableSectors produce opciones con nombres reales de sectores', async () => {
    await fixture.whenStable();
    component.ngOnInit();
    await fixture.whenStable();

    const sectors = component.availableSectors();
    expect(sectors.length).toBe(1);
    expect(sectors[0].label).toBe('Sector Norte Olón');
    expect(sectors[0].label.includes('Sector #')).toBe(false);
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
        tipoRuta: undefined as unknown as RouteType,
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
