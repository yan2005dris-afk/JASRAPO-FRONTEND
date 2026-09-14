import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IReportContextItem, IReportEmailRequest } from '../models/report-workspace.model';

@Component({
  selector: 'app-report-email-dialog',
  imports: [A11yModule, ReactiveFormsModule],
  templateUrl: './report-email-dialog.component.html',
  styleUrl: './report-email-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportEmailDialogComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly previouslyFocusedElement = this.getFocusedElement();

  readonly title = input('Enviar reporte por correo');
  readonly description = input('El documento oficial se generará con el contexto indicado.');
  readonly initialRecipient = input('');
  readonly initialSubject = input('');
  readonly contextItems = input<readonly IReportContextItem[]>([]);
  readonly isSubmitting = input(false);

  readonly closed = output<void>();
  readonly submitted = output<IReportEmailRequest>();

  readonly form = new FormGroup({
    destinatario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    subject: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.form.setValue({
      destinatario: this.initialRecipient(),
      subject: this.initialSubject(),
    });
  }

  ngOnDestroy(): void {
    queueMicrotask(() => this.previouslyFocusedElement?.focus());
  }

  requestClose(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const subject = value.subject.trim();
    this.submitted.emit({
      destinatario: value.destinatario.trim(),
      subject: subject || undefined,
    });
  }

  private getFocusedElement(): HTMLElement | null {
    const activeElement = this.document.activeElement;
    return activeElement instanceof HTMLElement ? activeElement : null;
  }
}
