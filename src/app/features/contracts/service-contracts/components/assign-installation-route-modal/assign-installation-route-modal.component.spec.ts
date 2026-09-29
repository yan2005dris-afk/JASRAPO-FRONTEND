import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AssignInstallationRouteModalComponent } from './assign-installation-route-modal.component';
import type { IContract } from '../../domain/models/service-contract.model';
import { ContractsService } from '../../services/contracts.service';
import { ReadingRoutesService } from '../../../reading-routes/data/reading-routes.api';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

describe('AssignInstallationRouteModalComponent', () => {
  let component: AssignInstallationRouteModalComponent;
  let fixture: ComponentFixture<AssignInstallationRouteModalComponent>;
  const assignInstallationRoute = vi.fn(() => of({ rutaId: 7 }));
  const getRoutes = vi.fn(() => of({ data: [], meta: { total: 0 } }));

  const contract: IContract = {
    contratoId: 'contract-1',
    clienteId: 'client-1',
    categoriaTarifaId: 1,
    numeroGuia: 'GUIA-001',
    fechaInicio: '2026-01-01',
    direccionSuministro: 'Calle Principal',
    estadoServicio: 'PENDIENTE_INSTALACION',
    comunidadId: 3,
    sectorId: null,
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: '',
      valorBase: 1,
      consumoMinimoMensual: 1,
      valorExcedenteM3: 1,
    },
    cliente: {
      clienteId: 'client-1',
      identificacion: '0000000000',
      nombres: 'Ana',
      apellidos: 'Pérez',
      razonSocial: null,
      email: null,
      telefono: null,
      direccionDomicilio: null,
    },
    comunidad: { comunidadId: 3, codigo: 'C-3', nombre: 'Centro' },
    sector: null,
    historialMedidores: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignInstallationRouteModalComponent],
      providers: [
        { provide: ContractsService, useValue: { assignInstallationRoute } },
        { provide: ReadingRoutesService, useValue: { getRoutes } },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignInstallationRouteModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contract', contract);
    fixture.detectChanges();
  });

  it('defaults to existing routes and loads routes for the contract community', () => {
    expect(component.mode()).toBe('existing');
    expect(getRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ tipoRuta: 'INSTALACION', estado: 'PENDIENTE', comunidadId: 3 }),
    );
    expect(getRoutes).toHaveBeenCalledTimes(1);
    expect(component.isValid()).toBe(false);
  });

  it('requires a selected route in existing mode', () => {
    component.availableRoutes.set([
      {
        rutaId: 7,
        nombre: 'Ruta 7',
        operarioId: 0,
        tipoRuta: 'INSTALACION',
        comunidadId: 3,
        periodoId: null,
        estado: 'PENDIENTE',
      },
    ]);
    component.selectRoute(component.availableRoutes()[0]);

    expect(component.isValid()).toBe(true);
    component.submit();
    expect(assignInstallationRoute).toHaveBeenCalledWith('contract-1', { routeId: 7 });
  });

  it('requires a planned date for a new route', () => {
    component.setMode('new');
    component.fechaPlanificada.set('');
    expect(component.isValid()).toBe(false);
    component.fechaPlanificada.set('2026-09-20');
    component.submit();
    expect(assignInstallationRoute).toHaveBeenCalledWith('contract-1', {
      fechaPlanificada: '2026-09-20',
    });
  });
});
