import { TestBed } from '@angular/core/testing';

import { ReportResponsiveResultsComponent } from './report-responsive-results.component';

describe('ReportResponsiveResultsComponent', () => {
  it('pdfViewerAndResultsAdaptWithoutDataLoss', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportResponsiveResultsComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportResponsiveResultsComponent);
    fixture.componentRef.setInput('caption', 'Abonos');
    fixture.componentRef.setInput('columns', [
      { key: 'cliente', label: 'Cliente' },
      { key: 'valor', label: 'Valor', align: 'end' },
    ]);
    fixture.componentRef.setInput('rows', [
      { id: '1', cells: { cliente: 'CLIENTE DE PRUEBA', valor: '$25.00' } },
    ]);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('.report-results-table') as HTMLElement;
    const cards = fixture.nativeElement.querySelector('.report-results-cards') as HTMLElement;
    expect(table.textContent).toContain('CLIENTE DE PRUEBA');
    expect(table.textContent).toContain('$25.00');
    expect(cards.textContent).toContain('CLIENTE DE PRUEBA');
    expect(cards.textContent).toContain('$25.00');
  });
});
