import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { IMeter, IMeterHistory, IReplaceMeterResponse } from '../../domain/models/meter.model';
import { MetersApi } from '../../data/meters.api';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-meter-history-modal',
  imports: [CommonModule, EmptyStateComponent, StatusBadgeComponent],
  templateUrl: './meter-history-modal.component.html',
  styleUrl: './meter-history-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterHistoryModalComponent implements OnInit {
  private readonly metersService = inject(MetersApi);
  private readonly toastService = inject(ToastService);

  readonly meter = input<IMeter | null>(null);
  readonly closeModal = output<void>();

  readonly history = signal<IMeterHistory[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly view = signal<'lista' | 'detalle'>('lista');
  readonly detail = signal<IReplaceMeterResponse | null>(null);
  readonly isLoadingDetail = signal(false);

  ngOnInit(): void {
    const current = this.meter();
    if (current) {
      this.loadHistory(current.medidorId);
    }
  }

  private loadHistory(medidorId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.metersService
      .getMeterHistory(medidorId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (rows) => this.history.set(rows),
        error: (err: HttpErrorResponse) =>
          this.errorMessage.set(err.error?.message || 'Error al cargar el historial del medidor.'),
      });
  }

  openDetail(reemplazoId: string | null): void {
    if (!reemplazoId) return;
    this.view.set('detalle');
    this.detail.set(null);
    this.isLoadingDetail.set(true);
    this.metersService
      .getReplacementDetail(reemplazoId)
      .pipe(finalize(() => this.isLoadingDetail.set(false)))
      .subscribe({
        next: (detalle) => this.detail.set(detalle),
        error: (err: HttpErrorResponse) => {
          this.toastService.error(
            err.error?.message || 'Error al cargar el detalle del cambio.',
            'Error',
          );
          this.view.set('lista');
        },
      });
  }

  backToList(): void {
    this.view.set('lista');
    this.detail.set(null);
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
