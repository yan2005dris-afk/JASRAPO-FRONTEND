import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { ClientsService } from '../../contracts/clients/services/clients.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ReportsService } from '../services/reports.service';
import { PaymentsReportComponent } from './payments-report';

describe('PaymentsReportComponent', () => {
  it('clientPickerTrapsEscapeAndRestoresFocus', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    await TestBed.configureTestingModule({
      imports: [PaymentsReportComponent],
      providers: [
        {
          provide: ReportsService,
          useValue: {},
        },
        {
          provide: ClientsService,
          useValue: {
            searchClients: () => of({ data: [] }),
          },
        },
        {
          provide: ToastService,
          useValue: {},
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PaymentsReportComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirBuscadorClientes();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.directive(CdkTrapFocus))).toBeTruthy();
    const searchInput = fixture.nativeElement.querySelector(
      '.picker-modal input[type="search"]',
    ) as HTMLInputElement;
    expect(searchInput.hasAttribute('cdkfocusinitial')).toBe(true);
    searchInput.focus();

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(fixture.componentInstance.isClientPickerOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
