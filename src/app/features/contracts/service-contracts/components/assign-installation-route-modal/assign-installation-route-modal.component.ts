import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractsService } from '../../services/contracts.service';
import { ReadingRoutesService } from '../../../reading-routes/services/reading-routes.service';
import { IContract } from '../../interfaces/icontract.interface';
import {
  IFindAllRoutesParams,
  IReadingRoute,
} from '../../../reading-routes/interfaces/ireading-route.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';

type Mode = 'new' | 'existing';

@Component({
  selector: 'app-assign-installation-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, DatePickerComponent],
  templateUrl: './assign-installation-route-modal.component.html',
  styleUrl: './assign-installation-route-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
  },
})
export class AssignInstallationRouteModalComponent {
  private readonly contractsService = inject(ContractsService);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);

  readonly contract = input.required<IContract>();
  readonly assigned = output<IReadingRoute>();
  readonly closed = output<void>();

  readonly mode = signal<Mode>('new');
  readonly selectedRouteId = signal<string | number | null>(null);
  readonly fechaPlanificada = signal<string>(new Date().toISOString().split('T')[0]);
  readonly availableRoutes = signal<IReadingRoute[]>([]);
  readonly isLoading = signal(false);
  readonly isLoadingRoutes = signal(false);

  selectRoute(r: IReadingRoute): void {
    if (this.selectedRouteId() === r.rutaId) {
      this.selectedRouteId.set(null);
    } else {
      this.selectedRouteId.set(r.rutaId);
    }
  }

  readonly isValid = computed(() => {
    if (this.mode() === 'new') {
      return !!this.fechaPlanificada();
    }
    return this.selectedRouteId() !== null;
  });

  setMode(mode: Mode): void {
    this.mode.set(mode);
    if (mode === 'existing' && this.availableRoutes().length === 0) {
      this.loadAvailableRoutes();
    }
  }

  private loadAvailableRoutes(): void {
    this.isLoadingRoutes.set(true);
    // Cargar rutas INSTALACION en estado PENDIENTE (sin filtro de fecha
    // para que la secretaria pueda ver rutas de hoy y de días anteriores
    // que aún no se despacharon)
    this.routesService
      .getRoutes({
        tipoRuta: 'INSTALACION',
        estado: 'PENDIENTE',
        page: 1,
        limit: 50,
      } satisfies IFindAllRoutesParams)
      .subscribe({
        next: (res) => {
          this.availableRoutes.set(res.data);
          this.isLoadingRoutes.set(false);
        },
        error: () => {
          this.availableRoutes.set([]);
          this.isLoadingRoutes.set(false);
        },
      });
  }

  submit(): void {
    if (!this.isValid() || this.isLoading()) return;

    const payload =
      this.mode() === 'new'
        ? { fechaPlanificada: this.fechaPlanificada() }
        : { routeId: Number(this.selectedRouteId()) };

    this.isLoading.set(true);
    this.contractsService
      .assignInstallationRoute(String(this.contract().contratoId), payload)
      .subscribe({
        next: (route: unknown) => {
          this.isLoading.set(false);
          this.toastService.show(
            this.mode() === 'new'
              ? 'Ruta de instalación creada y contrato asignado'
              : 'Contrato asignado a la ruta seleccionada',
            'success',
          );
          this.assigned.emit(route as IReadingRoute);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err?.error?.message || 'Error al asignar el contrato';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }
}
