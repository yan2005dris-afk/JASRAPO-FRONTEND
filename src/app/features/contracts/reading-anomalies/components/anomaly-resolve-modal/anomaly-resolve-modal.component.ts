import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingAnomaliesApi } from '../../data/reading-anomalies.api';
import { IReadingAnomaly } from '../../domain/models/reading-anomaly.model';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

@Component({
  selector: 'app-anomaly-resolve-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, LocalDatePipe],
  templateUrl: './anomaly-resolve-modal.component.html',
  styleUrl: './anomaly-resolve-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnomalyResolveModalComponent {
  private readonly anomaliesService = inject(ReadingAnomaliesApi);
  private readonly toastService = inject(ToastService);

  readonly anomaly = input.required<IReadingAnomaly>();
  readonly resolved = output<void>();
  readonly closed = output<void>();

  motivoDescarte = '';
  isDiscarding = false;
  isLoading = false;

  get isPending(): boolean {
    const st = this.anomaly().estado;
    return st === 'OPEN' || st === 'PENDIENTE';
  }

  get canResolve(): boolean {
    const st = this.anomaly().estado;
    return st === 'OPEN' || st === 'PENDIENTE' || st === 'IN_PROGRESS' || st === 'EN_REVISION';
  }

  setInReview(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.anomaliesService
      .updateAnomaly(this.anomaly().anomaliaId, { estado: 'IN_PROGRESS' })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Novedad pasada a estado "En Revisión"', 'info');
          this.resolved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al actualizar estado a En Revisión';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  resolveAnomaly(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.anomaliesService
      .updateAnomaly(this.anomaly().anomaliaId, { estado: 'RESOLVED' })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Novedad marcada como resuelta', 'success');
          this.resolved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al resolver novedad';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  showDiscardForm(): void {
    this.isDiscarding = true;
  }

  cancelDiscard(): void {
    this.isDiscarding = false;
    this.motivoDescarte = '';
  }

  confirmDiscard(): void {
    if (!this.motivoDescarte.trim() || this.isLoading) return;

    this.isLoading = true;
    const obs = this.anomaly().observacion
      ? `${this.anomaly().observacion} | Descarte: ${this.motivoDescarte.trim()}`
      : `Descarte: ${this.motivoDescarte.trim()}`;

    this.anomaliesService
      .updateAnomaly(this.anomaly().anomaliaId, {
        estado: 'CANCELLED',
        observacion: obs,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Novedad cancelada/descartada', 'warning');
          this.resolved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al descartar novedad';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
