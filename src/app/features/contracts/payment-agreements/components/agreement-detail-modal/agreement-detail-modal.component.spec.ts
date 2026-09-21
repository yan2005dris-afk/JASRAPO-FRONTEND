import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PaymentAgreementsService } from '../../services/payment-agreements.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { IAgreement } from '../../interfaces/ipayment-agreement.interface';
import { AgreementDetailModalComponent } from './agreement-detail-modal.component';

function buildAgreement(codigo: string, abonoInicial = 0): IAgreement {
  return {
    convenioId: '15',
    contratoId: '7',
    numeroCuotas: 6,
    abonoInicial,
    deudaTotal: 300,
    mesesMoraActual: 2,
    estado: { codigo, nombre: codigo },
    fechaPrimerPago: '2026-10-01',
    montoPagadoActual: 0,
    fechaCreacion: '2026-09-16',
  } as IAgreement;
}

describe('AgreementDetailModalComponent', () => {
  let component: AgreementDetailModalComponent;
  let fixture: ComponentFixture<AgreementDetailModalComponent>;
  let serviceSpy: {
    updateAgreement: ReturnType<typeof vi.fn>;
    cancelAgreement: ReturnType<typeof vi.fn>;
    getAgreementPdf: ReturnType<typeof vi.fn>;
  };
  let dialogSpy: { confirm: ReturnType<typeof vi.fn> };
  let toastSpy: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceSpy = {
      updateAgreement: vi.fn().mockReturnValue(of(buildAgreement('ACTIVO'))),
      cancelAgreement: vi.fn().mockReturnValue(of(buildAgreement('ANULADO'))),
      getAgreementPdf: vi.fn().mockReturnValue(of(new Blob())),
    };
    dialogSpy = { confirm: vi.fn().mockReturnValue(of(true)) };
    toastSpy = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AgreementDetailModalComponent],
      providers: [
        { provide: PaymentAgreementsService, useValue: serviceSpy },
        { provide: ConfirmDialogService, useValue: dialogSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementDetailModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('agreement', buildAgreement('PREPARADO'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece activar en los estados que el backend admite', () => {
    for (const codigo of ['PREPARADO', 'PENDIENTE_ABONO']) {
      fixture.componentRef.setInput('agreement', buildAgreement(codigo));
      expect(component.canActivate).toBe(true);
    }
  });

  it('no ofrece activar en estados que el backend rechaza', () => {
    for (const codigo of ['ACTIVO', 'PAGADO', 'ANULADO']) {
      fixture.componentRef.setInput('agreement', buildAgreement(codigo));
      expect(component.canActivate).toBe(false);
    }
  });

  it('activa el convenio y avisa al listado', () => {
    const actualizado = vi.fn();
    component.updated.subscribe(actualizado);

    component.activateAgreement();

    expect(serviceSpy.updateAgreement).toHaveBeenCalledWith('15', { estado: 'ACTIVO' });
    expect(toastSpy.show).toHaveBeenCalledWith('Convenio activado exitosamente', 'success');
    expect(actualizado).toHaveBeenCalledTimes(1);
  });

  it('no activa nada si el usuario cancela la confirmación', () => {
    dialogSpy.confirm.mockReturnValue(of(false));

    component.activateAgreement();

    expect(serviceSpy.updateAgreement).not.toHaveBeenCalled();
  });

  it('advierte del abono inicial pendiente antes de activar', () => {
    fixture.componentRef.setInput('agreement', buildAgreement('PENDIENTE_ABONO', 50));

    component.activateAgreement();

    const config = dialogSpy.confirm.mock.calls[0][0];
    expect(config.message).toContain('abono inicial');
    expect(config.message).toContain('50');
  });

  it('no advierte de abono cuando el convenio está preparado', () => {
    component.activateAgreement();

    const config = dialogSpy.confirm.mock.calls[0][0];
    expect(config.message).not.toContain('abono inicial');
  });
});
