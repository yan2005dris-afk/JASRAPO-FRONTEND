import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Mock, vi } from 'vitest';

import { CreateAgreementModalComponent } from './create-agreement-modal.component';
import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import type { IContract } from '../../../service-contracts/interfaces/icontract.interface';

describe('CreateAgreementModalComponent', () => {
  let component: CreateAgreementModalComponent;
  let fixture: ComponentFixture<CreateAgreementModalComponent>;
  let contractsServiceSpy: { getContracts: Mock };
  let agreementsServiceSpy: { getDebtSummary: Mock; createAgreement: Mock };

  const buildContract = (contratoId: string, numeroGuia: string): IContract =>
    ({
      contratoId,
      numeroGuia,
      estado: 'ACTIVO',
      cliente: {
        clienteId: contratoId,
        identificacion: '0912345678',
        nombres: 'María',
        apellidos: 'Pérez',
        razonSocial: null,
      },
    }) as IContract;

  const contractA = buildContract('10', 'GUIA-1-0010');
  const contractB = buildContract('20', 'GUIA-1-0020');

  const contractsPage = {
    data: [contractA, contractB],
    meta: { total: 2 },
  };

  const debtSummary = {
    contratoId: '10',
    deudaTotal: 240,
    deudaAnterior: 0,
    tasaMensualVigente: 0.01,
    maxMesesAtrasado: 3,
    totalPrefacturasImpagadas: 3,
    prefacturas: [],
  };

  const lastContractsQuery = () =>
    contractsServiceSpy.getContracts.mock.calls[
      contractsServiceSpy.getContracts.mock.calls.length - 1
    ][0];

  beforeEach(async () => {
    vi.useFakeTimers();

    contractsServiceSpy = {
      getContracts: vi.fn().mockReturnValue(of(contractsPage)),
    };
    agreementsServiceSpy = {
      getDebtSummary: vi.fn().mockReturnValue(of(debtSummary)),
      createAgreement: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [CreateAgreementModalComponent],
      providers: [
        { provide: ContractsService, useValue: contractsServiceSpy },
        { provide: PaymentAgreementsService, useValue: agreementsServiceSpy },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAgreementModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre en el paso 1 y carga la primera página de contratos', () => {
    expect(component.currentStep).toBe(1);
    expect(contractsServiceSpy.getContracts).toHaveBeenCalledTimes(1);
    expect(lastContractsQuery()).toEqual({ search: undefined, page: 1, limit: 5 });
    expect(component.contracts).toHaveLength(2);
    expect(component.totalContracts).toBe(2);
  });

  it('busca contratos con debounce y vuelve a la primera página', () => {
    component.onContractsPageChange(2);
    component.onContractSearchInput('María');

    expect(contractsServiceSpy.getContracts).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(400);

    expect(contractsServiceSpy.getContracts).toHaveBeenCalledTimes(3);
    expect(lastContractsQuery().search).toBe('María');
    expect(component.contractsPage).toBe(1);
  });

  it('no avanza al paso 2 sin contrato elegido', () => {
    component.goToStep(2);

    expect(component.currentStep).toBe(1);
    expect(agreementsServiceSpy.getDebtSummary).not.toHaveBeenCalled();
  });

  it('un clic marca el contrato sin salir del paso 1', () => {
    component.markContract(contractA);

    expect(component.selectedContract).toBe(contractA);
    expect(component.isContractSelected(contractA)).toBe(true);
    expect(component.currentStep).toBe(1);
  });

  it('el botón Elegir pasa al paso 2 y consulta la deuda del contrato', () => {
    component.chooseContract(contractA);

    expect(component.currentStep).toBe(2);
    expect(agreementsServiceSpy.getDebtSummary).toHaveBeenCalledWith('10');
    expect(component.debtSummary).toEqual(debtSummary);
  });

  it('permite volver al paso 1 para cambiar el contrato', () => {
    component.chooseContract(contractA);
    component.backToContractSelection();

    expect(component.currentStep).toBe(1);
    expect(component.selectedContract).toBe(contractA);
  });

  it('reconsulta la deuda al cambiar de contrato y descarta el abono anterior', () => {
    component.chooseContract(contractA);
    component.abonoInicial = 50;

    component.backToContractSelection();
    component.chooseContract(contractB);

    expect(component.abonoInicial).toBe(0);
    expect(agreementsServiceSpy.getDebtSummary).toHaveBeenLastCalledWith('20');
  });

  it('reutiliza la deuda ya consultada si se vuelve al mismo contrato', () => {
    component.chooseContract(contractA);
    component.backToContractSelection();
    component.chooseContract(contractA);

    expect(agreementsServiceSpy.getDebtSummary).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando el contrato no registra deuda pendiente', () => {
    agreementsServiceSpy.getDebtSummary.mockReturnValue(of({ ...debtSummary, deudaTotal: 0 }));

    component.chooseContract(contractA);

    expect(component.searchError).toContain('no registra deuda pendiente');
    expect(component.isFormValid).toBe(false);
  });

  it('reporta el error cuando falla la consulta de deuda', () => {
    agreementsServiceSpy.getDebtSummary.mockReturnValue(throwError(() => new Error('network')));

    component.chooseContract(contractA);

    expect(component.debtSummary).toBeNull();
    expect(component.searchError).toContain('#10');
  });

  it('simula las cuotas sobre la deuda menos el abono inicial', () => {
    component.chooseContract(contractA);
    component.abonoInicial = 40;
    component.numeroCuotas = 4;

    expect(component.netFinancedDebt).toBe(200);
    const cuotas = component.simulatedInstallments;
    expect(cuotas).toHaveLength(4);
    expect(cuotas[0].valorCuota).toBe(50);
    expect(cuotas[3].saldoRestante).toBe(0);
  });

  it('crea el convenio con el contrato elegido en el paso 1', () => {
    component.chooseContract(contractB);
    component.numeroCuotas = 6;
    component.abonoInicial = 0;
    component.fechaPrimerPago = '2026-09-01';
    component.motivo = '  Calamidad doméstica  ';

    component.submit();

    expect(agreementsServiceSpy.createAgreement).toHaveBeenCalledWith({
      contratoId: '20',
      numeroCuotas: 6,
      abonoInicial: 0,
      fechaPrimerPago: '2026-09-01',
      motivo: 'Calamidad doméstica',
    });
  });

  it('no envía el convenio si el abono cubre toda la deuda', () => {
    component.chooseContract(contractA);
    component.abonoInicial = 240;

    component.submit();

    expect(component.isFormValid).toBe(false);
    expect(agreementsServiceSpy.createAgreement).not.toHaveBeenCalled();
  });
});
