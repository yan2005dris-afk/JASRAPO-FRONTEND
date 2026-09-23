import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { ReportWorkspaceComponent } from './report-workspace.component';

@Component({
  imports: [ReportWorkspaceComponent],
  template: `
    <app-report-workspace
      title="Reporte contractual"
      description="Descripción del reporte"
      [contextItems]="contextItems"
      [showSummary]="true"
      [showToolbar]="true"
      [showResults]="true"
    >
      <form reportFilters>Filtros compartidos</form>
      <div reportSummary>Resumen compartido</div>
      <div reportFormats>Formatos compartidos</div>
      <button reportActions type="button">Acción compartida</button>
      <div reportResults>Resultados compartidos</div>
    </app-report-workspace>
  `,
})
class ReportWorkspaceHostComponent {
  readonly contextItems = [{ label: 'Período', value: 'Agosto 2026' }];
}

describe('ReportWorkspaceComponent', () => {
  it('reportWorkspaceComposesAllSharedRegions', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportWorkspaceHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportWorkspaceHostComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Reporte contractual');
    expect(text).toContain('Filtros compartidos');
    expect(text).toContain('Agosto 2026');
    expect(text).toContain('Resumen compartido');
    expect(text).toContain('Formatos compartidos');
    expect(text).toContain('Acción compartida');
    expect(text).toContain('Resultados compartidos');
  });

  describe('persistent errors', () => {
    let fixture: ComponentFixture<ReportWorkspaceComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ReportWorkspaceComponent],
      }).compileComponents();
      fixture = TestBed.createComponent(ReportWorkspaceComponent);
      fixture.componentRef.setInput('title', 'Reporte');
      fixture.componentRef.setInput('description', 'Descripción');
      fixture.componentRef.setInput('status', 'error');
      fixture.componentRef.setInput('statusMessage', 'Falló la consulta');
      fixture.detectChanges();
    });

    it('reportErrorPersistsUntilSuccessfulRetry', () => {
      const retrySpy = vi.spyOn(fixture.componentInstance.retry, 'emit');
      const retryButton = fixture.debugElement.query(By.css('.report-status--error button'));
      retryButton.triggerEventHandler('click');
      fixture.detectChanges();

      expect(retrySpy).toHaveBeenCalledOnce();
      expect(fixture.nativeElement.textContent).toContain('Falló la consulta');

      fixture.componentRef.setInput('status', 'idle');
      fixture.componentRef.setInput('statusMessage', '');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Falló la consulta');
    });
  });
});
