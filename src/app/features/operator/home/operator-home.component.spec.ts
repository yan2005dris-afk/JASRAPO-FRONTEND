import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { OperatorHomeComponent } from './operator-home.component';
import { AuthService } from '../../../core/services/auth.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { OperatorRouteOfflineService } from '../service/operator-route-offline.service';
import type { OperatorRouteResponse } from '../models/operator.models';

const mockAssignedRoutes: OperatorRouteResponse[] = [
  {
    rutaId: 'r-101',
    tipoRuta: 'TOMA_LECTURA',
    nombre: 'Casco Central Olón',
    comunidadId: 1,
    comunidadNombre: 'Comuna Olón',
    sectorId: 1,
    sectorNombre: 'Centro',
    estado: 'EN_PROGRESO',
    operarioId: 42,
    operario: { usuarioId: 42, nombres: 'Carlos', apellidos: 'Mendoza' },
    medidor: null,
    ordenesTrabajo: [
      {
        ordenTrabajoId: 'ot-1',
        rutaId: 'r-101',
        tipoActividad: 'LECTURA',
        estado: 'COMPLETADA',
        ordenVisita: 1,
        contratoId: 'c-1',
        medidor: { medidorId: 'm-1', serie: 'SR-1001' },
        contrato: {
          numeroContrato: 'CNT-1',
          clienteNombre: 'María Tomalá',
          direccion: 'Av. Malecón 98',
        },
      },
      {
        ordenTrabajoId: 'ot-2',
        rutaId: 'r-101',
        tipoActividad: 'LECTURA',
        estado: 'PENDIENTE',
        ordenVisita: 2,
        contratoId: 'c-2',
        medidor: { medidorId: 'm-2', serie: 'SR-1002' },
        contrato: {
          numeroContrato: 'CNT-2',
          clienteNombre: 'Juan Pérez',
          direccion: 'Av. Malecón 104',
        },
      },
    ],
  },
];

describe('OperatorHomeComponent', () => {
  let fixture: ComponentFixture<OperatorHomeComponent>;
  let component: OperatorHomeComponent;
  let router: Router;

  const mockAuthService = {
    currentUser: signal({
      id: 42,
      name: 'Carlos Mendoza',
      email: 'carlos@jasrapo.gob.ec',
      roleName: 'Operador Técnico',
    }),
  };

  const mockNetworkService = {
    isOnline: signal(true),
  };

  const mockSyncService = {
    totalPending: signal(0),
    isSyncing: signal(false),
  };

  const mockIndexedDbService = {
    getMetersCache: vi.fn().mockResolvedValue([]),
    getRegisteredReadingsCache: vi.fn().mockResolvedValue([]),
    getPendingReadings: vi.fn().mockResolvedValue([]),
  };

  const mockRouteOfflineService = {
    loadAssignedRoutes: vi.fn().mockResolvedValue({ routes: mockAssignedRoutes }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorHomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: OperatorSyncService, useValue: mockSyncService },
        { provide: IndexedDbService, useValue: mockIndexedDbService },
        { provide: OperatorRouteOfflineService, useValue: mockRouteOfflineService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatorHomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render operator initials correctly', () => {
    expect(component).toBeTruthy();
    expect(component.userInitials()).toBe('CM');
    expect(component.currentUser().nombre).toBe('Carlos Mendoza');
  });

  it('should identify the active hero route and compute radial progress', () => {
    const hero = component.heroActiveRoute();
    expect(hero).toBeTruthy();
    expect(hero?.nombre).toBe('Casco Central Olón');
    expect(component.getHeroStopsCount()).toBe(2);
    expect(component.getHeroReadCount()).toBe(1);
    expect(component.getHeroProgressPct()).toBe(50);
  });

  it('should identify the next pending stop from active route orders', () => {
    const nextStop = component.nextPendingStop();
    expect(nextStop).toBeTruthy();
    expect(nextStop?.ordenVisita).toBe(2);
    expect(nextStop?.cliente).toBe('Juan Pérez');
    expect(nextStop?.serie).toBe('SR-1002');
    expect(nextStop?.tipoActividad).toBe('LECTURA');
  });

  it('should navigate to readings when resumeActiveRoute is called', () => {
    component.resumeActiveRoute();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/lecturas'], {
      queryParams: {
        rutaNombre: 'Casco Central Olón',
        rutaTipo: 'TOMA_LECTURA',
      },
    });
  });

  it('should navigate to map view when goToRoutesMap is called', () => {
    component.goToRoutesMap();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/rutas']);
  });

  it('should navigate to next pending stop with query params', () => {
    const stop = component.nextPendingStop()!;
    component.goToPendingStop(stop);
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/lecturas'], {
      queryParams: {
        rutaNombre: 'Casco Central Olón',
        rutaTipo: 'TOMA_LECTURA',
        serie: 'SR-1002',
      },
    });
  });

  it('should navigate to novelty creation when goToNewNovelty is called', () => {
    component.goToNewNovelty();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/novedades/new']);
  });

  it('should navigate to sync queue when goToSync is called', () => {
    component.goToSync();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/sincronizar']);
  });
});
