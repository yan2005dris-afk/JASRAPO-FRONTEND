import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';
import { ActivatedRoute, Router } from '@angular/router';

import { PaymentAgreementCreateComponent } from './payment-agreement-create.component';
import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import type { IContract } from '../../../service-contracts/interfaces/icontract.interface';

describe('PaymentAgreementCreateComponent', () => {
  let component: PaymentAgreementCreateComponent;
  let fixture: ComponentFixture<PaymentAgreementCreateComponent>;
  let agreementsServiceSpy: {
    getDebtSummary: Mock;
    createAgreement: Mock;
  };
  let contractsServiceSpy: {
    getContracts: Mock;
    getContractById: Mock;
  };
  let routerSpy: {
    navigate: Mock;
  };

  const dummyContract: IContract = {
    contratoId: '101',
    numeroGuia: 'GUIA-001',
    estado: 'ACTIVO',
    clienteId: '1',
    direccionSuministro: 'Calle Principal',
    fechaInicio: '2025-01-01',
    categoriaTarifaId: 1,
    comunidadId: 1,
    sectorId: 1,
    categoriaTarifa: {
      categoriaTarifaId: 1,
      nombre: 'Residencial',
      descripcion: 'Tarifa básica',
      valorBase: 5,
      consumoMinimoMensual: 10,
      valorExcedenteM3: 0.5,
    },
    comunidad: {
      comunidadId: 1,
      codigo: 'COM-01',
      nombre: 'Centro',
    },
    sector: {
      sectorId: 1,
      codigo: 'SEC-01',
      nombre: 'Sector Norte',
    },
    historialMedidores: [],
    cliente: {
      clienteId: '1',
      identificacion: '0999999999',
      nombres: 'Juan',
      apellidos: 'Pérez',
      razonSocial: null,
      email: 'juan@example.com',
      telefono: '0999999999',
      direccionDomicilio: 'Calle Principal',
    },
  };

  beforeEach(async () => {
    agreementsServiceSpy = {
      getDebtSummary: vi.fn().mockReturnValue(
        of({
          contratoId: '101',
          deudaTotal: 120,
          maxMesesAtrasado: 3,
          totalPrefacturasImpagadas: 3,
        }),
      ),
      createAgreement: vi.fn().mockReturnValue(of({ convenioId: '1' })),
    };

    contractsServiceSpy = {
      getContracts: vi.fn().mockReturnValue(of({ data: [dummyContract], meta: { total: 1 } })),
      getContractById: vi.fn().mockReturnValue(of(dummyContract)),
    };

    routerSpy = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PaymentAgreementCreateComponent],
      providers: [
        { provide: PaymentAgreementsService, useValue: agreementsServiceSpy },
        { provide: ContractsService, useValue: contractsServiceSpy },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (param: string) => (param === 'contratoId' ? null : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentAgreementCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('inicia en el paso 1 y carga contratos', () => {
    expect(component.currentStep).toBe(1);
    expect(contractsServiceSpy.getContracts).toHaveBeenCalled();
  });

  it('avanza al paso 2 al elegir un contrato y consulta la deuda', () => {
    component.chooseContract(dummyContract);

    expect(component.currentStep).toBe(2);
    expect(component.selectedContract).toBe(dummyContract);
    expect(agreementsServiceSpy.getDebtSummary).toHaveBeenCalledWith('101');
  });

  it('calcula las cuotas simuladas correctamente en el paso 2', () => {
    component.chooseContract(dummyContract);
    component.numeroCuotas = 6;
    component.abonoInicial = 20;

    expect(component.netFinancedDebt).toBe(100);
    expect(component.simulatedInstallments.length).toBe(6);
  });

  it('envía el formulario y redirige al listado de convenios', () => {
    component.chooseContract(dummyContract);
    component.submit();

    expect(agreementsServiceSpy.createAgreement).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/Contratos/ConveniosDePago']);
  });
});
