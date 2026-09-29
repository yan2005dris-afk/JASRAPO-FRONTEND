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
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from '../../data/reading-routes.api';
import { UsersService } from '../../../../users/services/users.service';
import { User } from '../../../../users/models/user.interface';
import { IReadingRoute, IReassignRouteDto } from '../../interfaces/ireading-route.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { resolveOperarioNombre } from '../../../../../shared/utils/operator-name';
import { filterOperariosByRole } from '../../../../../shared/utils/users';

@Component({
  selector: 'app-reassign-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reassign-route-modal.component.html',
  styleUrl: './reassign-route-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
  },
})
export class ReassignRouteModalComponent implements OnInit {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  readonly route = input.required<IReadingRoute>();
  readonly reassigned = output<void>();
  readonly closed = output<void>();

  readonly operarios = signal<User[]>([]);
  readonly nuevoOperarioId = signal<number | null>(null);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => this.operarios.set(filterOperariosByRole(res.data)),
    });
  }

  getOperarioNombre(operarioId: number | null | undefined): string {
    return resolveOperarioNombre(this.operarios(), operarioId);
  }

  get isValid(): boolean {
    const nuevo = this.nuevoOperarioId();
    return !!nuevo && nuevo > 0 && nuevo !== this.route().operarioId;
  }

  submit(): void {
    const nuevo = this.nuevoOperarioId();
    if (!nuevo || !this.isValid || this.isLoading()) return;

    const dto: IReassignRouteDto = {
      operarioId: Number(nuevo),
    };

    this.isLoading.set(true);
    this.routesService.reassignRoute(this.route().rutaId, dto).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toastService.show('Ruta reasignada exitosamente', 'success');
        this.reassigned.emit();
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Error al reasignar ruta';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
