import { TestBed } from '@angular/core/testing';

import { ReportStatusComponent } from './report-status.component';

describe('ReportStatusComponent', () => {
  it('reportStatusUsesLabelsAndAriaLive', async () => {
    await TestBed.configureTestingModule({ imports: [ReportStatusComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ReportStatusComponent);
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('message', 'No se pudo cargar el reporte');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.textContent).toContain('No se pudo cargar el reporte');
    expect(alert.querySelector('button')?.textContent).toContain('Reintentar');
  });
});
