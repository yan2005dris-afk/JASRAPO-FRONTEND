import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { ReportEmailDialogComponent } from './report-email-dialog.component';

describe('ReportEmailDialogComponent', () => {
  it('emailDialogTrapsEscapeAndRestoresFocus', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    await TestBed.configureTestingModule({
      imports: [ReportEmailDialogComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportEmailDialogComponent);
    const closeSpy = vi.spyOn(fixture.componentInstance.closed, 'emit');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.directive(CdkTrapFocus))).toBeTruthy();
    const backdrop = fixture.nativeElement.querySelector('.report-dialog-backdrop') as HTMLElement;
    backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closeSpy).toHaveBeenCalledOnce();

    fixture.destroy();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('references the validation description only while the recipient is invalid', async () => {
    await TestBed.configureTestingModule({
      imports: [ReportEmailDialogComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportEmailDialogComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '#report-email-recipient',
    ) as HTMLInputElement;

    expect(input.hasAttribute('aria-describedby')).toBe(false);

    fixture.componentInstance.form.controls.destinatario.markAsTouched();
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toBe('report-email-recipient-error');
    expect(fixture.nativeElement.querySelector('#report-email-recipient-error')).toBeTruthy();

    fixture.componentInstance.form.controls.destinatario.setValue('usuario@example.com');
    fixture.detectChanges();
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(fixture.nativeElement.querySelector('#report-email-recipient-error')).toBeNull();
  });
});
