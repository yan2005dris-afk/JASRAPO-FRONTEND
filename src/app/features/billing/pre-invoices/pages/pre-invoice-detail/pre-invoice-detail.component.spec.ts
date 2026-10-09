import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { IPreInvoice } from '../../interfaces/ipre-invoice.interface';
import { PreInvoicesService } from '../../services/pre-invoices.service';
import { PreInvoiceDetailComponent } from './pre-invoice-detail.component';

describe('PreInvoiceDetailComponent', () => {
  let fixture: ComponentFixture<PreInvoiceDetailComponent>;

  const preInvoice = (overrides: Partial<IPreInvoice>): IPreInvoice => ({
    prefacturaId: 1,
    uuid: 'uuid-1',
    contratoId: 10,
    periodoId: 1,
    subtotal: 4,
    iva: 0,
    descuentoTotal: 0,
    totalPagar: 4,
    estado: 'GENERADA',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    ...overrides,
  });

  const render = async (data: IPreInvoice): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [PreInvoiceDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
        {
          provide: PreInvoicesService,
          useValue: { getPreInvoiceById: vi.fn().mockReturnValue(of(data)) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreInvoiceDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra el subsidio de ley separado de los demás descuentos', async () => {
    const host = await render(preInvoice({ descuentoTotal: 7, subsidioLey: 2 }));

    expect(host.textContent).toContain('Subsidio Ley Tercera Edad / Discapacidad: -$2.00');
    expect(host.textContent).toContain('Desc: -$5.00');
  });

  it('no repite el subsidio como descuento cuando es el único', async () => {
    const host = await render(preInvoice({ descuentoTotal: 2, subsidioLey: 2 }));

    expect(host.textContent).toContain('Subsidio Ley Tercera Edad / Discapacidad: -$2.00');
    expect(host.textContent).not.toContain('Desc:');
  });

  it('muestra solo el descuento cuando no hay subsidio', async () => {
    const host = await render(preInvoice({ descuentoTotal: 3 }));

    expect(host.textContent).not.toContain('Subsidio Ley');
    expect(host.textContent).toContain('Desc: -$3.00');
  });
});
