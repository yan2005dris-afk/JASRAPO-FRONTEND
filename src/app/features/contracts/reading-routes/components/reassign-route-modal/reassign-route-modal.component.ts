import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import { IReadingRoute, IReassignRouteDto } from '../../interfaces/ireading-route.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-reassign-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reassign-route-modal.component.html',
  styleUrl: './reassign-route-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReassignRouteModalComponent {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);

  readonly route = input.required<IReadingRoute>();
  readonly reassigned = output<void>();
  readonly closed = output<void>();

  nuevoOperarioId: number | null = null;
  isLoading = false;

  get isValid(): boolean {
    return !!this.nuevoOperarioId && this.nuevoOperarioId > 0 && this.nuevoOperarioId !== this.route().operarioId;
  }

  submit(): void {
    if (!this.isValid || this.isLoading || !this.nuevoOperarioId) return;

    const dto: IReassignRouteDto = {
      operarioId: Number(this.nuevoOperarioId),
    };

    this.isLoading = true;
    this.routesService.reassignRoute(this.route().rutaId, dto).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Ruta reasignada exitosamente', 'success');
        this.reassigned.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al reasignar ruta';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
