import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractsService } from '../../services/contracts.service';
import { ReadingRoutesService } from '../../../reading-routes/data/reading-routes.api';
import { IContract } from '../../interfaces/icontract.interface';
import {
  IFindAllRoutesParams,
  IReadingRoute,
} from '../../../reading-routes/interfaces/ireading-route.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';

const ASSIGNMENT_MODE = {
  EXISTING: 'existing',
  NEW: 'new',
} as const;
type AssignmentMode = (typeof ASSIGNMENT_MODE)[keyof typeof ASSIGNMENT_MODE];

@Component({
  selector: 'app-assign-installation-route-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, DatePickerComponent],
  templateUrl: './assign-installation-route-modal.component.html',
  styleUrl: './assign-installation-route-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
    '(document:keydown.escape)': 'close()',
  },
})
export class AssignInstallationRouteModalComponent implements OnInit {
  private readonly contractsService = inject(ContractsService);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly contract = input.required<IContract>();
  readonly assigned = output<IReadingRoute>();
  readonly closed = output<void>();

  readonly mode = signal<AssignmentMode>(ASSIGNMENT_MODE.EXISTING);
  readonly selectedRouteId = signal<string | number | null>(null);
  readonly fechaPlanificada = signal<string>(new Date().toISOString().split('T')[0]);
  readonly availableRoutes = signal<IReadingRoute[]>([]);
  readonly isLoading = signal(false);
  readonly isLoadingRoutes = signal(false);
  readonly routeError = signal('');

  ngOnInit(): void {
    this.loadAvailableRoutes(this.contract().comunidadId);
  }

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

  setMode(mode: AssignmentMode): void {
    this.mode.set(mode);
    if (mode === 'existing' && this.availableRoutes().length === 0) {
      this.loadAvailableRoutes(this.contract().comunidadId);
    }
  }

  private loadAvailableRoutes(comunidadId: number): void {
    this.isLoadingRoutes.set(true);
    this.routeError.set('');
    // Cargar rutas INSTALACION en estado PENDIENTE (sin filtro de fecha
    // para que la secretaria pueda ver rutas de hoy y de días anteriores
    // que aún no se despacharon)
    this.routesService
      .getRoutes({
        tipoRuta: 'INSTALACION',
        estado: 'PENDIENTE',
        comunidadId,
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
          this.routeError.set('No se pudieron cargar las rutas pendientes. Intentá nuevamente.');
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
        next: (route) => {
          this.isLoading.set(false);
          this.toastService.show(
            this.mode() === 'new'
              ? 'Ruta de instalación creada y contrato asignado'
              : 'Contrato asignado a la ruta seleccionada',
            'success',
          );
          this.assigned.emit(route);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err?.error?.message || 'Error al asignar el contrato';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
  }

  close(): void {
    if (!this.isLoading()) {
      this.closed.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      this.elementRef.nativeElement.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) as NodeListOf<HTMLElement>,
    );
    if (focusable.length < 2) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }
}
