import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LecturasComponent } from './lecturas.component';
import { Router, ActivatedRoute } from '@angular/router';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { signal } from '@angular/core';
import { IMeterDto } from '../../contracts/meters/domain/models/meter.model';

describe('LecturasComponent State Machine', () => {
  let component: LecturasComponent;
  let fixture: ComponentFixture<LecturasComponent>;
  let submitReading: ReturnType<typeof vi.fn>;
  let submitReadingCoordinates: ReturnType<typeof vi.fn>;
  let submitWorkOrder: ReturnType<typeof vi.fn>;
  const mockMeter: IMeterDto = {
    medidorId: 101,
    serie: 'SER-101',
    marca: 'MarcaX',
    modelo: 'Mod1',
    estado: 'ACTIVO',
    contratoId: 'CONT-1',
    clienteNombre: 'Carlos Gomez',
    fechaInstalacion: '2026-01-01',
  };

  beforeEach(() => {
    submitReading = vi.fn().mockResolvedValue({ lecturaId: 'lec-1' });
    submitReadingCoordinates = vi.fn().mockResolvedValue({ id: 'wo-reading' });
    submitWorkOrder = vi.fn().mockResolvedValue({ id: 'wo-1' });
    TestBed.configureTestingModule({
      imports: [LecturasComponent],
      providers: [
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => {
                  if (key === 'rutaNombre') return 'Ruta Central';
                  if (key === 'rutaTipo') return 'LECTURA';
                  if (key === 'workOrders') {
                    return 'SER-101:LECTURA:wo-reading:PENDIENTE';
                  }
                  return null;
                },
              },
            },
          },
        },
        {
          provide: IndexedDbService,
          useValue: {
            getRegisteredReadingsCache: vi.fn().mockResolvedValue([]),
            getPendingReadings: vi.fn().mockResolvedValue([]),
            getSyncedReadings: vi.fn().mockResolvedValue([]),
            savePendingReading: vi.fn().mockResolvedValue(1),
            getAssignedWorkOrders: vi.fn().mockResolvedValue([]),
            saveMetersCache: vi.fn().mockResolvedValue(undefined),
            saveRegisteredReadingsCache: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NetworkService,
          useValue: {
            isOnline: signal(true),
          },
        },
        {
          provide: OperatorSyncService,
          useValue: {
            getReadingEstados: vi.fn().mockResolvedValue([]),
            submitReading,
            submitReadingCoordinates,
            submitWorkOrder,
            refreshPendingCounts: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 1, nombres: 'Operario', apellidos: 'Uno' }),
          },
        },
        {
          provide: MeterCacheService,
          useValue: {
            metersList: signal([mockMeter]),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(LecturasComponent);
    component = fixture.componentInstance;
  });

  it('initializes in search state', () => {
    expect(component.state()).toEqual({ kind: 'search' });
    expect(component.currentStep()).toBe('search');
    expect(component.selectedMeter()).toBeNull();
  });

  it('paginates route orders ten at a time while keeping the total count', () => {
    const meters = Array.from({ length: 25 }, (_, index) => ({
      ...mockMeter,
      medidorId: index + 1,
      serie: `SER-${index + 1}`,
      clienteNombre: `Cliente ${index + 1}`,
    }));
    component.metersList.set(meters);
    component.routeSyntheticMeters.set([]);
    fixture.detectChanges();

    expect(component.orderCounts().total).toBe(25);
    expect(component.orderPageCount()).toBe(3);
    expect(component.pagedOrders()).toHaveLength(10);
    expect(fixture.nativeElement.querySelectorAll('.radial-card')).toHaveLength(10);

    component.goToOrderPage(2);
    fixture.detectChanges();
    expect(component.pagedOrders()[0].serie).toBe('SER-11');
    expect(fixture.nativeElement.querySelector('#order-card-10')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Mostrando 11–20 de 25 órdenes');

    component.goToOrderPage(3);
    fixture.detectChanges();
    expect(component.pagedOrders()).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.radial-card')).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('Mostrando 21–25 de 25 órdenes');
  });

  it('resets to page one when filtering or searching route orders', () => {
    component.metersList.set(
      Array.from({ length: 25 }, (_, index) => ({
        ...mockMeter,
        medidorId: index + 1,
        serie: `SER-${index + 1}`,
        clienteNombre: `Cliente ${index + 1}`,
      })),
    );
    component.routeSyntheticMeters.set([]);
    component.completedWorkOrderIds.set(new Set(['1', '2', '3']));
    fixture.detectChanges();

    component.goToOrderPage(3);
    component.setOrderFilter('COMPLETADAS');
    expect(component.currentOrderPage()).toBe(1);
    expect(component.pagedOrders()).toHaveLength(3);

    component.setOrderFilter('TODAS');
    component.goToOrderPage(3);
    const search = fixture.nativeElement.querySelector('.search-input-box') as HTMLInputElement;
    search.value = 'Cliente 25';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.currentOrderPage()).toBe(1);
    expect(component.pagedOrders().map((meter) => meter.serie)).toEqual(['SER-25']);
  });

  it('clamps the visible page if synchronized orders shrink', () => {
    component.metersList.set(
      Array.from({ length: 21 }, (_, index) => ({
        ...mockMeter,
        medidorId: index + 1,
        serie: `SER-${index + 1}`,
      })),
    );
    component.routeSyntheticMeters.set([]);
    fixture.detectChanges();
    component.goToOrderPage(3);
    expect(component.currentOrderPage()).toBe(3);

    component.metersList.set(component.metersList().slice(0, 12));
    fixture.detectChanges();
    expect(component.currentOrderPage()).toBe(2);
    expect(component.pagedOrders()).toHaveLength(2);
  });

  it('transitions from search to actions on selectMeter', () => {
    component.selectMeter(mockMeter);
    expect(component.state()).toEqual({ kind: 'actions', meter: mockMeter });
    expect(component.currentStep()).toBe('actions');
    expect(component.selectedMeter()).toEqual(mockMeter);
  });

  it('transitions from actions to form for LECTURA', () => {
    component.selectMeter(mockMeter);
    component.goToReadingForm();
    expect(component.state()).toEqual({
      kind: 'form',
      meter: mockMeter,
      tipo: 'LECTURA',
    });
    expect(component.currentStep()).toBe('form');
    expect(component.activeTipoActividad()).toBe('LECTURA');
    expect(component.selectedMeter()).toEqual(mockMeter);
  });

  it('sends the selected meter series and assigned order to the novelty form', () => {
    component.ngOnInit();
    component.selectMeter(mockMeter);
    component.goToNoveltyForm();

    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      ['/app/operador/novedades/new'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          medidorId: 101,
          serie: 'SER-101',
          ordenTrabajoId: 'wo-reading',
        }),
      }),
    );
  });

  it('transitions from actions to form for INSTALACION, INSPECCION, RECONEXION', () => {
    component.selectMeter(mockMeter);

    component.goToWorkOrderForm('INSTALACION');
    expect(component.state()).toEqual({
      kind: 'form',
      meter: mockMeter,
      tipo: 'INSTALACION',
    });
    expect(component.activeTipoActividad()).toBe('INSTALACION');

    component.goToWorkOrderForm('INSPECCION');
    expect(component.state()).toEqual({
      kind: 'form',
      meter: mockMeter,
      tipo: 'INSPECCION',
    });
    expect(component.activeTipoActividad()).toBe('INSPECCION');

    component.goToWorkOrderForm('RECONEXION');
    expect(component.state()).toEqual({
      kind: 'form',
      meter: mockMeter,
      tipo: 'RECONEXION',
    });
    expect(component.activeTipoActividad()).toBe('RECONEXION');
  });

  it('transitions back to actions from form preserving meter', () => {
    component.selectMeter(mockMeter);
    component.goToWorkOrderForm('INSPECCION');
    component.goBackToActions();

    expect(component.state()).toEqual({ kind: 'actions', meter: mockMeter });
    expect(component.currentStep()).toBe('actions');
    expect(component.selectedMeter()).toEqual(mockMeter);
  });

  it('transitions back to search from actions or form', () => {
    component.selectMeter(mockMeter);
    component.goBackToSearch();
    expect(component.state()).toEqual({ kind: 'search' });
    expect(component.selectedMeter()).toBeNull();

    component.selectMeter(mockMeter);
    component.goToReadingForm();
    component.clearSelection();
    expect(component.state()).toEqual({ kind: 'search' });
    expect(component.selectedMeter()).toBeNull();
  });

  it('stores GPS on the linked work order before submitting a reading', async () => {
    component.ngOnInit();
    component.registeredReadings.set([
      { lecturaId: 'lec-1', medidorId: mockMeter.medidorId, estado: 'PENDIENTE' },
    ]);
    component.selectMeter(mockMeter);

    await component.onWorkOrderSubmit({
      tipoActividad: 'LECTURA',
      lecturaAnterior: 100,
      lecturaActual: 125,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });

    expect(submitReadingCoordinates).toHaveBeenCalledWith('wo-reading');
    expect(submitReading).toHaveBeenCalledWith(
      expect.objectContaining({ _lecturaId: 'lec-1', lecturaActual: 125 }),
    );
    expect(submitReadingCoordinates.mock.invocationCallOrder[0]).toBeLessThan(
      submitReading.mock.invocationCallOrder[0],
    );
  });

  it('does not submit the reading when mandatory GPS acquisition fails', async () => {
    component.ngOnInit();
    component.registeredReadings.set([
      { lecturaId: 'lec-1', medidorId: mockMeter.medidorId, estado: 'PENDIENTE' },
    ]);
    component.selectMeter(mockMeter);
    submitReadingCoordinates.mockRejectedValue(
      new Error('No se pudo obtener la ubicación. Activa el GPS.'),
    );

    await component.onWorkOrderSubmit({
      tipoActividad: 'LECTURA',
      lecturaAnterior: 100,
      lecturaActual: 125,
      fotoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    });

    expect(submitReading).not.toHaveBeenCalled();
    expect(component.submissionFeedback()).toEqual(
      expect.objectContaining({
        kind: 'error',
        message: expect.stringContaining('Activa el GPS'),
      }),
    );
  });

  describe('Route synthetic meters and meter-less work orders', () => {
    it('shows the contract address and guide instead of the cached model and internal ID', () => {
      const cachedMeter: IMeterDto = {
        medidorId: 6,
        serie: 'SER-6',
        marca: 'Sensus',
        modelo: 'iPerl',
        clienteNombre: 'MARCOS JOEL ALTAMIRANO ESCOBAR',
        contratoId: '6',
        fechaInstalacion: null,
      };
      component.metersList.set([cachedMeter]);
      sessionStorage.setItem(
        'activeOperatorRoute',
        JSON.stringify({
          rutaId: 'r-6',
          nombre: 'Ruta Lectura',
          tipoRuta: 'LECTURA',
          ordenesTrabajo: [
            {
              ordenTrabajoId: '45',
              rutaId: 'r-6',
              tipoActividad: 'LECTURA',
              estado: 'PENDIENTE',
              contratoId: '6',
              medidor: { medidorId: '6', serie: 'SER-6' },
              contrato: {
                numeroContrato: 'GUIA-5-0006',
                clienteNombre: 'MARCOS JOEL ALTAMIRANO ESCOBAR',
                direccion: 'Direccion contrato 6',
              },
            },
          ],
        }),
      );
      try {
        component['autoSelectFromQueryParam']();
        component.allowedSeries.set(new Set(['SER-6']));
        const meter = component.combinedMetersList()[0];
        expect(meter.medidorId).toBe(6);
        expect(meter.contratoId).toBe('6');
        expect(meter.modelo).toBe('iPerl');
        expect(meter.direccionSuministro).toBe('Direccion contrato 6');
        expect(meter.numeroGuia).toBe('GUIA-5-0006');

        component.searchQuery.set('GUIA-5-0006');
        expect(component.filteredMeters()).toHaveLength(1);
        fixture.detectChanges();
        const card = fixture.nativeElement.querySelector('.radial-card') as HTMLElement;
        expect(card.textContent).toContain('Direccion contrato 6');
        expect(card.textContent).toContain('#GUIA-5-0006');
        expect(card.textContent).not.toContain('iPerl');
        expect(card.textContent).not.toContain('#6');
      } finally {
        sessionStorage.removeItem('activeOperatorRoute');
      }
    });

    it('synthesizes meters from activeOperatorRoute in sessionStorage and auto-selects single order', () => {
      const routeData = {
        rutaId: 'r-insp-1',
        nombre: 'Inspección GUIA-2005-05',
        tipoRuta: 'INSPECCION',
        ordenesTrabajo: [
          {
            ordenTrabajoId: '45',
            rutaId: 'r-insp-1',
            tipoActividad: 'INSPECCION',
            estado: 'PENDIENTE',
            contratoId: 'c-1',
            contrato: {
              numeroContrato: 'GUIA-2005-05',
              clienteNombre: 'MARLON BRANDO ZAMBRANO SAAVEDRA',
              direccion: 'Curia',
            },
          },
        ],
      };

      sessionStorage.setItem('activeOperatorRoute', JSON.stringify(routeData));

      // Trigger autoSelectFromQueryParam
      component['autoSelectFromQueryParam']();

      expect(component.routeSyntheticMeters().length).toBe(1);
      const synthetic = component.routeSyntheticMeters()[0];
      expect(synthetic.serie).toBe('GUIA-2005-05');
      expect(synthetic.clienteNombre).toBe('MARLON BRANDO ZAMBRANO SAAVEDRA');
      expect(synthetic.marca).toBe('INSPECCION');
      expect(synthetic.direccionSuministro).toBe('Curia');
      expect(synthetic.numeroGuia).toBe('GUIA-2005-05');
      expect(synthetic.contratoId).toBe('c-1');

      // Lands on search step (Órdenes de Trabajo view) to list orders
      expect(component.currentStep()).toBe('search');

      // Selecting the order transitions to the actions step
      component.selectMeter(synthetic);
      expect(component.currentStep()).toBe('actions');
      expect(component.selectedMeter()?.serie).toBe('GUIA-2005-05');

      // From actions step, completing the activity transitions to form
      component.goToWorkOrderForm('INSPECCION');
      expect(component.currentStep()).toBe('form');
      expect(component.activeTipoActividad()).toBe('INSPECCION');

      // Cleanup
      sessionStorage.removeItem('activeOperatorRoute');
    });

    it('resolves workOrderIdFor synthetic meter from medidorId fallback', () => {
      const syntheticMeter = {
        medidorId: -45,
        serie: 'GUIA-2005-05',
        marca: 'INSPECCION',
        modelo: 'Curia',
        clienteNombre: 'MARLON BRANDO ZAMBRANO SAAVEDRA',
        contratoId: 'GUIA-2005-05',
        fechaInstalacion: null,
      };

      const orderId = component['workOrderIdFor'](syntheticMeter, 'INSPECCION');
      expect(orderId).toBe('45');
    });
  });
});
