import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ReportFormatTabsComponent } from './report-format-tabs.component';

describe('ReportFormatTabsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFormatTabsComponent],
    }).compileComponents();
  });

  it('keeps only the active tab in the sequential tab order', () => {
    const fixture = TestBed.createComponent(ReportFormatTabsComponent);
    fixture.componentRef.setInput('activeFormat', 'table');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs[1].tabIndex).toBe(-1);

    fixture.componentRef.setInput('activeFormat', 'pdf');
    fixture.detectChanges();

    expect(tabs[0].tabIndex).toBe(-1);
    expect(tabs[1].tabIndex).toBe(0);
  });

  it('keeps the active PDF tab focusable while the document is loading', () => {
    const fixture = TestBed.createComponent(ReportFormatTabsComponent);
    fixture.componentRef.setInput('activeFormat', 'pdf');
    fixture.componentRef.setInput('pdfLoading', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const pdfTab = root.querySelector<HTMLButtonElement>('#report-pdf-tab');

    expect(pdfTab?.disabled).toBe(false);
    expect(pdfTab?.tabIndex).toBe(0);
    expect(pdfTab?.getAttribute('aria-busy')).toBe('true');
  });

  it('supports arrow, Home and End keyboard navigation', () => {
    const fixture = TestBed.createComponent(ReportFormatTabsComponent);
    const changeSpy = vi.spyOn(fixture.componentInstance.formatChange, 'emit');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(tabs[1]);
    expect(changeSpy).toHaveBeenLastCalledWith('pdf');

    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(tabs[0]);
    expect(changeSpy).toHaveBeenLastCalledWith('table');

    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(tabs[1]);
    expect(changeSpy).toHaveBeenLastCalledWith('pdf');

    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(tabs[0]);
    expect(changeSpy).toHaveBeenLastCalledWith('table');
  });

  it('moves focus to the controlled panel after clicking an inactive tab', async () => {
    const panel = document.createElement('section');
    panel.id = 'report-results-panel';
    panel.tabIndex = -1;
    document.body.appendChild(panel);

    const fixture = TestBed.createComponent(ReportFormatTabsComponent);
    fixture.componentRef.setInput('activeFormat', 'table');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const pdfTab = root.querySelector<HTMLButtonElement>('#report-pdf-tab');

    pdfTab?.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(document.activeElement).toBe(panel);
    panel.remove();
  });
});
