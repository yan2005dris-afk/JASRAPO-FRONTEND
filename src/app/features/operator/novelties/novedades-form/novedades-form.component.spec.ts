import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { NovedadesFormComponent } from './novedades-form.component';
import { MeterCacheService } from '../../../../core/services/meter-cache.service';
import { IndexedDbService } from '../../../../core/services/indexed-db.service';
import { OperatorSyncService } from '../../../../core/services/operator-sync.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { NetworkService } from '../../../../core/services/network.service';
import { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';
import { OperatorService } from '../../service/operator.service';
import type { OperatorNovelty } from '../../domain/models/operator.models';
import { of } from 'rxjs';

describe('NovedadesFormComponent', () => {
  const meter: IMeterDto = {
    medidorId: 6,
    serie: 'SER-6',
    marca: 'Sensus',
    modelo: 'iPerl',
    clienteNombre: 'MARCOS JOEL ALTAMIRANO ESCOBAR',
    contratoId: '6',
    fechaInstalacion: null,
  };
  const order = {
    ordenTrabajoId: '45',
    rutaId: 'r-6',
    tipoActividad: 'LECTURA',
    estado: 'PENDIENTE',
    ordenVisita: 1,
    contratoId: '6',
    medidor: { medidorId: '6', serie: 'SER-6' },
    contrato: {
      numeroContrato: 'GUIA-5-0006',
      clienteNombre: 'MARCOS JOEL ALTAMIRANO ESCOBAR',
      direccion: 'Direccion contrato 6',
    },
  };

  async function setup(
    options: {
      params?: Record<string, string>;
      meters?: IMeterDto[];
      orders?: object[];
      online?: boolean;
      refreshedOrders?: object[];
      editingId?: string;
      existing?: OperatorNovelty;
    } = {},
  ) {
    const metersList = signal(options.meters ?? []);
    const db = { getAssignedWorkOrders: vi.fn().mockResolvedValue(options.orders ?? []) };
    if (options.refreshedOrders) {
      db.getAssignedWorkOrders
        .mockResolvedValueOnce(options.orders ?? [])
        .mockResolvedValueOnce(options.refreshedOrders);
    }
    const sync = {
      submitAnomaly: vi.fn().mockResolvedValue({}),
      updateAnomaly: vi.fn().mockResolvedValue({}),
      downloadAssignedData: vi.fn().mockResolvedValue({}),
    };
    const toast = { error: vi.fn(), success: vi.fn() };
    const router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NovedadesFormComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(options.params ?? {}),
              paramMap: convertToParamMap(options.editingId ? { id: options.editingId } : {}),
            },
          },
        },
        { provide: Router, useValue: router },
        {
          provide: MeterCacheService,
          useValue: { metersList, load: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: IndexedDbService, useValue: db },
        { provide: OperatorSyncService, useValue: sync },
        {
          provide: OperatorService,
          useValue: { getNovelty: vi.fn().mockReturnValue(of(options.existing)) },
        },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
        { provide: NetworkService, useValue: { isOnline: signal(options.online ?? false) } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NovedadesFormComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.isLoadingMeters()).toBe(false));
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, db, sync, toast, router };
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.removeItem('activeOperatorRoute');
  });

  it('opens the linked meter and order even when the meter catalog is empty', async () => {
    const { component, fixture } = await setup({
      params: { medidorId: '6', serie: 'SER-6', ordenTrabajoId: '45' },
      orders: [order],
    });
    expect(component.selectedMeter()?.serie).toBe('SER-6');
    expect(component.resolvedOrdenTrabajoId()).toBe('45');
    expect(fixture.nativeElement.textContent).toContain('MARCOS JOEL ALTAMIRANO ESCOBAR');
    expect(fixture.nativeElement.textContent).toContain('Orden de Trabajo asignada: #45');
  });

  it('recovers the selected route order from session storage when offline cache lacks it', async () => {
    sessionStorage.setItem(
      'activeOperatorRoute',
      JSON.stringify({ rutaId: 'r-6', ordenesTrabajo: [order] }),
    );
    const { component } = await setup({
      params: { serie: 'SER-6', ordenTrabajoId: '45' },
    });
    expect(component.selectedMeter()?.serie).toBe('SER-6');
    expect(component.resolvedOrdenTrabajoId()).toBe('45');
  });

  it('keeps a meterless route stop linked to its work order', async () => {
    sessionStorage.setItem(
      'activeOperatorRoute',
      JSON.stringify({
        rutaId: 'r-7',
        paradas: [
          {
            ordenTrabajoId: '46',
            tipoActividad: 'INSPECCION',
            estado: 'PENDIENTE',
            clienteNombre: 'CLIENTE SIN MEDIDOR',
            direccionSuministro: 'Direccion de prueba',
          },
        ],
      }),
    );
    const { component } = await setup({ params: { serie: 'OT-46', ordenTrabajoId: '46' } });
    expect(component.selectedMeter()?.serie).toBe('OT-46');
    expect(component.resolvedOrdenTrabajoId()).toBe('46');
    expect(component.selectedMeter()?.clienteNombre).toBe('CLIENTE SIN MEDIDOR');
  });

  it('refreshes assigned data online when the search catalog is empty', async () => {
    const { component, sync } = await setup({ online: true, refreshedOrders: [order] });
    expect(sync.downloadAssignedData).toHaveBeenCalledOnce();
    expect(component.availableMeters().map((item) => item.serie)).toContain('SER-6');
  });

  it('searches by exact guide, client and address while preserving cached meter identity', async () => {
    const { component } = await setup({ meters: [meter], orders: [order] });
    const merged = component.availableMeters()[0];
    expect(merged.medidorId).toBe(6);
    expect(merged.modelo).toBe('iPerl');
    expect(merged.numeroGuia).toBe('GUIA-5-0006');
    for (const query of ['GUIA-5-0006', 'MARCOS JOEL', 'Direccion contrato 6', 'SER-6']) {
      component.searchQuery.set(query);
      expect(component.filteredMeters()).toHaveLength(1);
    }
    component.searchQuery.set('NO EXISTE');
    expect(component.filteredMeters()).toHaveLength(0);
  });

  it('filters and selects a meter through the visible search box', async () => {
    const { component, fixture } = await setup({ meters: [meter], orders: [order] });
    const input = fixture.nativeElement.querySelector('.search-input') as HTMLInputElement;
    input.value = 'GUIA-5-0006';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.filteredMeters()).toHaveLength(1);
    const card = fixture.nativeElement.querySelector('.meter-item') as HTMLButtonElement;
    expect(card.textContent).toContain('SER-6');
    card.click();
    fixture.detectChanges();
    expect(component.selectedMeter()?.medidorId).toBe(6);
    expect(component.resolvedOrdenTrabajoId()).toBe('45');
  });

  it('submits an assigned novelty without requiring a previous reading', async () => {
    const { component, sync, router } = await setup({ meters: [meter], orders: [order] });
    await component.selectMeter(component.availableMeters()[0]);
    component.noveltyForm.setValue({ tipo: 'FUGA', observacion: 'Fuga visible en el medidor' });
    await component.onSubmit();
    expect(sync.submitAnomaly).toHaveBeenCalledWith(
      expect.objectContaining({ ordenTrabajoId: '45', medidorId: '6', tipo: 'FUGA' }),
    );
    expect(sync.submitAnomaly.mock.calls[0][0]).not.toHaveProperty('lecturaId');
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/novedades']);
  });

  it('does not queue a novelty without an assigned work order', async () => {
    const { component, sync, toast } = await setup({ meters: [meter] });
    await component.selectMeter(meter);
    component.noveltyForm.setValue({ tipo: 'FUGA', observacion: 'Fuga visible en el medidor' });
    await component.onSubmit();
    expect(sync.submitAnomaly).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('orden de trabajo'),
      'Sin orden de trabajo',
    );
  });

  it('clears the prior work-order context when the user changes meters', async () => {
    const { component } = await setup({
      params: { medidorId: '6', ordenTrabajoId: '45', lecturaId: '99' },
      meters: [meter, { ...meter, medidorId: 7, serie: 'SER-7' }],
      orders: [order],
    });
    component.clearSelection();
    await component.selectMeter(
      component.availableMeters().find((item) => item.serie === 'SER-7')!,
    );
    expect(component.resolvedOrdenTrabajoId()).toBeNull();
    expect(component.presetOrdenTrabajoId()).toBeNull();
  });

  it('edits the original report via PATCH path instead of creating another one', async () => {
    const { component, sync, router, fixture } = await setup({
      editingId: '12',
      online: true,
      meters: [meter],
      orders: [order],
      existing: {
        novedadId: '12',
        ordenTrabajoId: '45',
        lecturaId: null,
        medidorId: '6',
        medidorSerie: 'SER-6',
        contratoId: '6',
        comunidadId: 1,
        comunidadNombre: 'Comunidad 1',
        sectorId: 1,
        sectorNombre: 'Sector 1',
        numeroGuia: 'GUIA-5-0006',
        clienteNombre: 'MARCOS JOEL ALTAMIRANO ESCOBAR',
        direccionSuministro: 'Direccion contrato 6',
        tipo: 'FUGA',
        observacion: 'Observacion anterior',
        estado: 'OPEN',
        fotoUrl: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    expect(component.selectedMeter()?.serie).toBe('SER-6');
    expect(component.noveltyForm.value).toEqual({
      tipo: 'FUGA',
      observacion: 'Observacion anterior',
    });
    expect(fixture.nativeElement.textContent).toContain('Editar Novedad');
    component.noveltyForm.patchValue({ observacion: 'Observacion corregida' });
    await component.onSubmit();
    expect(sync.updateAnomaly).toHaveBeenCalledWith('12', {
      tipo: 'FUGA',
      observacion: 'Observacion corregida',
      fotoBlob: null,
    });
    expect(sync.submitAnomaly).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/app/operador/novedades']);
  });

  it('cannot turn an offline edit into a new report', async () => {
    const { component, sync } = await setup({ editingId: '12', meters: [meter] });
    expect(component.editLoadError()).toBe(true);
    await component.onSubmit();
    expect(sync.submitAnomaly).not.toHaveBeenCalled();
    expect(sync.updateAnomaly).not.toHaveBeenCalled();
  });
});
