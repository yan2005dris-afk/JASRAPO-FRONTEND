import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NovedadesComponent } from './novedades.component';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorService } from '../service/operator.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { AuthService } from '../../../core/services/auth.service';
import type { OperatorNovelty } from '../models/operator.models';

const novelty: OperatorNovelty = {
  novedadId: '12',
  ordenTrabajoId: '45',
  lecturaId: null,
  medidorId: '6',
  medidorSerie: 'SER-6',
  contratoId: '7',
  comunidadId: 1,
  comunidadNombre: 'Comunidad 1',
  sectorId: 1,
  sectorNombre: 'Sector 1',
  numeroGuia: 'GUIA-7',
  clienteNombre: 'CLIENTE EJEMPLO',
  direccionSuministro: 'DIRECCION',
  tipo: 'FUGA',
  observacion: 'Fuga visible',
  estado: 'OPEN',
  fotoUrl: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
};

describe('NovedadesComponent', () => {
  async function setup(
    options: {
      online?: boolean;
      results?: OperatorNovelty[];
      cached?: OperatorNovelty[] | null;
      savedAt?: string;
      pending?: object[];
      failOnline?: boolean;
    } = {},
  ) {
    const operator = {
      getNovelties: vi
        .fn()
        .mockReturnValue(
          options.failOnline
            ? throwError(() => new Error('network'))
            : of({ data: options.results ?? [], total: (options.results ?? []).length }),
        ),
    };
    const db = {
      getOperatorNoveltiesCache: vi
        .fn()
        .mockResolvedValue(
          options.cached == null
            ? null
            : { items: options.cached, savedAt: options.savedAt ?? new Date().toISOString() },
        ),
      saveOperatorNoveltiesCache: vi.fn().mockResolvedValue(undefined),
      getPendingAnomalies: vi.fn().mockResolvedValue(options.pending ?? []),
    };
    const router = { navigate: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [NovedadesComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: NetworkService, useValue: { isOnline: signal(options.online ?? true) } },
        { provide: OperatorService, useValue: operator },
        {
          provide: MeterCacheService,
          useValue: { load: vi.fn().mockResolvedValue(undefined), metersList: signal([]) },
        },
        { provide: IndexedDbService, useValue: db },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NovedadesComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      if (options.online === false || options.failOnline) {
        expect(db.getOperatorNoveltiesCache).toHaveBeenCalled();
      } else {
        expect(operator.getNovelties).toHaveBeenCalled();
      }
    });
    await fixture.whenStable();
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, operator, db, router };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('lists work-order novelties even when lecturaId is null', async () => {
    const { component, fixture, db } = await setup({ results: [novelty] });
    await vi.waitFor(() => expect(component.anomalies()).toHaveLength(1));
    fixture.detectChanges();
    expect(component.anomalies()[0].lecturaId).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Fuga visible');
    expect(fixture.nativeElement.querySelector('.btn-edit')).not.toBeNull();
    expect(db.saveOperatorNoveltiesCache).toHaveBeenCalledWith('operator:1', [novelty]);
  });

  it('opens a real edit route for the original novelty ID', async () => {
    const { component, router } = await setup({ results: [novelty] });
    await vi.waitFor(() => expect(component.anomalies()).toHaveLength(1));
    component.editNovedad(component.anomalies()[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/novedades', '12', 'edit']);
  });

  it('reads operator-scoped cache offline and hides server edit', async () => {
    const { component, fixture, operator } = await setup({ online: false, cached: [novelty] });
    await vi.waitFor(() => expect(component.anomalies()).toHaveLength(1));
    fixture.detectChanges();
    expect(operator.getNovelties).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.btn-edit')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('guardados localmente');
  });

  it('shows separate queued novelties even when the same meter already has one', async () => {
    const { component } = await setup({
      results: [novelty],
      pending: [
        {
          id: 1,
          ordenTrabajoId: '45',
          medidorId: '6',
          serie: 'SER-6',
          tipo: 'OTRO',
          observacion: 'Primera',
          syncState: 'PENDIENTE_SYNC',
        },
        {
          id: 2,
          ordenTrabajoId: '45',
          medidorId: '6',
          serie: 'SER-6',
          tipo: 'FUGA',
          observacion: 'Segunda',
          syncState: 'PENDIENTE_SYNC',
        },
      ],
    });
    await vi.waitFor(() => expect(component.anomalies()).toHaveLength(3));
    expect(component.anomalies().filter((item) => item.isPending)).toHaveLength(2);
  });

  it('falls back to cached work-order novelties when online request fails', async () => {
    const { component } = await setup({ failOnline: true, cached: [novelty] });
    await vi.waitFor(() => expect(component.anomalies()).toHaveLength(1));
    expect(component.isOffline()).toBe(true);
  });

  it('shows a stale warning for offline data older than one day', async () => {
    const savedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const { component, fixture } = await setup({ online: false, cached: [novelty], savedAt });
    expect(component.isStale()).toBe(true);
    expect(component.cachedAt()).toBe(savedAt);
    expect(fixture.nativeElement.textContent).toContain('desactualizados');
  });

  it('keeps recent offline data without a stale warning', async () => {
    const { component, fixture } = await setup({ online: false, cached: [novelty] });
    expect(component.isStale()).toBe(false);
    expect(fixture.nativeElement.querySelector('.stale-warning')).toBeNull();
  });

  it('shows queued novelties without a server reading and never offers Edit for them', async () => {
    const { component, fixture } = await setup({
      online: false,
      pending: [
        { id: 3, ordenTrabajoId: '45', medidorId: '6', tipo: 'FUGA', observacion: 'Pendiente' },
      ],
    });
    expect(component.anomalies()).toHaveLength(1);
    expect(component.anomalies()[0].lecturaId).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pendiente de sync');
    expect(fixture.nativeElement.querySelector('.btn-edit')).toBeNull();
  });

  it('keeps an empty state when neither the server nor local queue has reports', async () => {
    const { component, fixture } = await setup();
    expect(component.anomalies()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Sin novedades registradas');
  });
});
