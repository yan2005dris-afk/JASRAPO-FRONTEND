import { TestBed } from '@angular/core/testing';
import { LecturasComponent } from './lecturas.component';
import { Router, ActivatedRoute } from '@angular/router';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { OperatorService } from '../service/operator.service';
import { signal } from '@angular/core';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';

describe('LecturasComponent State Machine', () => {
  let component: LecturasComponent;
  const mockMeter: IMeterDto = {
    medidorId: 101,
    serie: 'SER-101',
    marca: 'MarcaX',
    modelo: 'Mod1',
    estado: 'ACTIVO',
    contratoId: 'CONT-1',
    clienteNombre: 'Carlos Gomez',
    fechaInstalacion: '2026-01-01',
    latitud: null,
    longitud: null,
  };

  beforeEach(() => {
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
                  if (key === 'rutaTipo') return 'TOMA_LECTURA';
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
            submitReading: vi.fn().mockResolvedValue({ lecturaId: 'lec-1' }),
            submitWorkOrder: vi.fn().mockResolvedValue({ id: 'wo-1' }),
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
        {
          provide: OperatorService,
          useValue: {
            syncAllMeters: vi.fn(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LecturasComponent);
    component = fixture.componentInstance;
  });

  it('initializes in search state', () => {
    expect(component.state()).toEqual({ kind: 'search' });
    expect(component.currentStep()).toBe('search');
    expect(component.selectedMeter()).toBeNull();
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
});
