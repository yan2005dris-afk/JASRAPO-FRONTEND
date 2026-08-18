import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingAnomaliesService } from '../../services/reading-anomalies.service';
import { IReadingAnomaly } from '../../interfaces/ianomaly.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-anomaly-resolve-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './anomaly-resolve-modal.component.html',
  styleUrl: './anomaly-resolve-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnomalyResolveModalComponent {
  private readonly anomaliesService = inject(ReadingAnomaliesService);
  private readonly toastService = inject(ToastService);

  readonly anomaly = input.required<IReadingAnomaly>();
  readonly resolved = output<void>();
  readonly closed = output<void>();

  motivoDescarte = '';
  isDiscarding = false;
  isLoading = false;

  get isPending(): boolean {
    return this.anomaly().estado === 'PENDIENTE';
  }

  get canResolve(): boolean {
    const st = this.anomaly().estado;
    return st === 'PENDIENTE' || st === 'EN_REVISION';
  }

  setInReview(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.anomaliesService
      .updateAnomaly(this.anomaly().anomaliaId, { estado: 'EN_REVISION' })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Anomalía pasada a estado "En Revisión"', 'info');
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
      .updateAnomaly(this.anomaly().anomaliaId, { estado: 'RESUELTA' })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Anomalía marcada como resuelta', 'success');
          this.resolved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al resolver anomalía';
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
        estado: 'DESCARTADA',
        observacion: obs,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Anomalía descartada', 'warning');
          this.resolved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al descartar anomalía';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
