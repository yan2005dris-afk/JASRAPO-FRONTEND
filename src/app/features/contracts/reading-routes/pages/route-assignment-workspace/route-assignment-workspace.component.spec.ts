import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RouteAssignmentWorkspaceComponent } from './route-assignment-workspace.component';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';

describe('RouteAssignmentWorkspaceComponent', () => {
  let component: RouteAssignmentWorkspaceComponent;
  let fixture: ComponentFixture<RouteAssignmentWorkspaceComponent>;

  const mockRouter = {
    navigate: vi.fn(),
  };

  const mockReadingRoutesService = {
    createAssignments: vi.fn(),
  };

  const mockComunidadesService = {
    getAllComunidades: vi.fn().mockReturnValue(
      of({
        data: [
          { id: 1, nombre: 'Comuna Centro', codigo: 'CC-01' },
          { id: 2, nombre: 'Comuna Norte', codigo: 'CN-02' },
        ],
      }),
    ),
  };

  const mockSectoresService = {
    getAllSectores: vi.fn().mockReturnValue(
      of({
        data: [
          { sectorId: 10, comunidadId: 1, codigo: 'SEC-10', nombre: 'Sector A' },
          { sectorId: 11, comunidadId: 1, codigo: 'SEC-11', nombre: 'Sector B' },
          { sectorId: 20, comunidadId: 2, codigo: 'SEC-20', nombre: 'Sector Norte 1' },
        ],
      }),
    ),
  };

  const mockUsersService = {
    getUsers: vi.fn().mockReturnValue(
      of({
        data: [
          {
            usuarioId: 5,
            nombres: 'Carlos',
            apellidos: 'Operador',
            telefono: '0912345678',
            email: 'carlos@example.com',
            rol: { rolId: 2, nombre: 'operadores' },
          },
          {
            usuarioId: 6,
            nombres: 'Maria',
            apellidos: 'Secretaria',
            telefono: '0987654321',
            email: 'maria@example.com',
            rol: { rolId: 3, nombre: 'secretaria' },
          },
        ],
      }),
    ),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  const mockConfirmDialogService = {
    confirm: vi.fn().mockReturnValue(of(true)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [RouteAssignmentWorkspaceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: ReadingRoutesService, useValue: mockReadingRoutesService },
        { provide: ComunidadesService, useValue: mockComunidadesService },
        { provide: SectoresService, useValue: mockSectoresService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteAssignmentWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load only users with operator role', () => {
    expect(component).toBeTruthy();
    expect(component.operarios().length).toBe(1);
    expect(component.operarios()[0].nombres).toBe('Carlos');
  });

  it('should filter operators by search query', () => {
    component.workerSearch.set('Carlos');
    expect(component.filteredOperarios().length).toBe(1);

    component.workerSearch.set('inexistente');
    expect(component.filteredOperarios().length).toBe(0);
  });

  it('should filter sectors according to selected community', () => {
    component.onComunidadChange(1);
    expect(component.filteredSectores().length).toBe(2);
    expect(component.filteredSectores()[0].sectorId).toBe(10);

    component.onComunidadChange(2);
    expect(component.filteredSectores().length).toBe(1);
    expect(component.filteredSectores()[0].sectorId).toBe(20);
  });

  it('should update suggested route name when activity type changes', () => {
    component.onPeriodSelected({
      periodoId: 1,
      nombre: '2026',
      estado: 'ABIERTO',
    });
    component.onFechaPlanificadaChange('2026-09');

    expect(component.sugeridoNombreBase()).toBe('Ruta Lectura - 2026 - Septiembre');

    component.onTipoActividadChange('CORTE');
    expect(component.sugeridoNombreBase()).toBe('Ruta Corte - 2026 - Septiembre');

    component.onTipoActividadChange('INSPECCION');
    expect(component.sugeridoNombreBase()).toBe('Ruta Inspección - 2026 - Septiembre');
  });

  it('should compute isFormValid correctly based on selected inputs', () => {
    expect(component.isFormValid()).toBe(false);

    // Set open period
    component.onPeriodSelected({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    });
    expect(component.isFormValid()).toBe(false);

    // Set worker
    component.selectOperario(5);
    expect(component.isFormValid()).toBe(false);

    // Set community
    component.onComunidadChange(1);
    expect(component.isFormValid()).toBe(false);

    // Toggle all community
    component.toggleAllCommunity();
    expect(component.isFormValid()).toBe(true);

    // Switch to individual sectors
    component.toggleSector(10);
    expect(component.isFormValid()).toBe(true);
    expect(component.isAllCommunitySelected()).toBe(false);
  });

  it('should execute assignment and navigate back when confirmed', async () => {
    mockReadingRoutesService.createAssignments.mockReturnValue(
      of([{ rutaId: '100', nombre: 'Ruta Lectura - Sector A' }]),
    );

    component.onPeriodSelected({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    });
    component.selectOperario(5);
    component.onComunidadChange(1);
    component.toggleSector(10);

    component.confirmAndSave();
    await fixture.whenStable();

    expect(mockConfirmDialogService.confirm).toHaveBeenCalled();
    expect(mockReadingRoutesService.createAssignments).toHaveBeenCalledWith({
      periodoId: 1,
      operarioId: 5,
      comunidadId: 1,
      tipoRuta: 'TOMA_LECTURA',
      sectorIds: [10],
      fechaPlanificada: expect.any(String),
      nombreBase: expect.stringContaining('Ruta Lectura'),
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/Contratos/RutasDeLectura']);
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('Se generaron exitosamente 1 ruta(s)'),
      'success',
    );
  });

  it('should handle error when createAssignments fails', async () => {
    mockReadingRoutesService.createAssignments.mockReturnValue(
      throwError(() => ({ error: { message: 'Error de prueba' } })),
    );

    component.onPeriodSelected({
      periodoId: 1,
      nombre: 'Enero 2026',
      estado: 'ABIERTO',
    });
    component.selectOperario(5);
    component.onComunidadChange(1);
    component.toggleAllCommunity();

    component.executeAssignment();

    expect(component.isLoading()).toBe(false);
    expect(mockToastService.show).toHaveBeenCalledWith('Error de prueba', 'error');
  });

  it('should navigate back on goBack()', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/Contratos/RutasDeLectura']);
  });
});
