import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchesService } from '../../services/batches.service';
import { IGenerateBatchDto } from '../../interfaces/ibatch.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { ReadingRoutesService } from '../../../../contracts/reading-routes/services/reading-routes.service';
import { IReadingRoute } from '../../../../contracts/reading-routes/interfaces/ireading-route.interface';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-generate-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './generate-batch-modal.component.html',
  styleUrl: './generate-batch-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateBatchModalComponent implements OnInit {
  private readonly batchesService = inject(BatchesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly generated = output<void>();
  readonly closed = output<void>();

  // State
  readonly periodoId = signal<number | null>(null);
  readonly mes = signal<number>(new Date().getMonth() + 1);
  readonly comunidadId = signal<number | null>(null);
  readonly selectedRouteId = signal<string | number | null>(null);
  readonly isLoading = signal(false);
  readonly isLoadingRoutes = signal(false);

  // Catalogs
  readonly meses = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' },
  ];
  readonly comunidades = signal<Comunidad[]>([]);
  readonly periodos = signal<{ periodoId: number; nombre?: string; estado: string }[]>([]);
  readonly routes = signal<IReadingRoute[]>([]);

  readonly selectedRoute = computed(() => {
    const id = this.selectedRouteId();
    if (!id) return null;
    return this.routes().find((r) => Number(r.rutaId) === Number(id)) || null;
  });

  readonly hasPendingRoutes = computed(() => {
    return this.routes().some((r) => r.estado !== 'COMPLETADA');
  });

  readonly isFormValid = computed(() => {
    const r = this.selectedRoute();
    return (
      this.periodoId() !== null &&
      !!r &&
      r.estado === 'COMPLETADA' &&
      r.tipoRuta === 'TOMA_LECTURA' &&
      !this.isLoadingRoutes()
    );
  });

  selectRoute(r: IReadingRoute): void {
    if (this.selectedRouteId() === r.rutaId) {
      this.selectedRouteId.set(null);
    } else {
      this.selectedRouteId.set(r.rutaId);
      if (r.comunidadId && this.comunidadId() !== r.comunidadId) {
        this.comunidadId.set(r.comunidadId);
      }
    }
  }

  ngOnInit(): void {
    this.loadCatalogs();
  }

  private loadCatalogs(): void {
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => {
        this.comunidades.set(res.data);
        this.cdr.markForCheck();
      },
    });

    this.routesService.getPeriods().subscribe({
      next: (res) => {
        this.periodos.set(res);
        const active = res.find((p) => p.estado === 'ABIERTO');
        if (active) {
          this.periodoId.set(active.periodoId);
          this.onFiltersChanged();
        }
        this.cdr.markForCheck();
      },
    });
  }

  onPeriodoChange(val: number | null): void {
    this.periodoId.set(val);
    this.selectedRouteId.set(null);
    this.onFiltersChanged();
  }

  onComunidadChange(val: number | null): void {
    this.comunidadId.set(val);
    this.selectedRouteId.set(null);
    this.onFiltersChanged();
  }

  onFiltersChanged(): void {
    const pId = this.periodoId();
    this.selectedRouteId.set(null);

    if (!pId) {
      this.routes.set([]);
      return;
    }

    this.isLoadingRoutes.set(true);
    this.cdr.markForCheck();

    this.routesService
      .getRoutes({
        periodoId: pId,
        comunidadId: this.comunidadId() || undefined,
        tipoRuta: 'TOMA_LECTURA',
        estado: 'COMPLETADA',
        limit: 50,
      })
      .subscribe({
        next: (res) => {
          this.routes.set(res.data || []);
          this.isLoadingRoutes.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.routes.set([]);
          this.isLoadingRoutes.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onMesChange(val: number): void {
    this.mes.set(Number(val));
    this.onFiltersChanged();
  }

  submitGenerate(): void {
    const pId = this.periodoId();
    const ruta = this.selectedRoute();
    if (!pId || !ruta || this.isLoading()) return;

    if (ruta.estado !== 'COMPLETADA' || ruta.tipoRuta !== 'TOMA_LECTURA') {
      this.toastService.show(
        'Para generar el lote seleccione una ruta de trabajo de TOMA_LECTURA en estado COMPLETADA.',
        'error',
      );
      return;
    }

    const dto: IGenerateBatchDto = {
      periodoId: Number(pId),
      rutaId: Number(ruta.rutaId),
      mes: Number(this.mes()),
    };

    const cId = this.comunidadId();
    if (cId) {
      dto.comunidadId = Number(cId);
    }

    this.isLoading.set(true);
    this.batchesService.generateBatch(dto).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.show(
          res.message || 'Lote de prefacturas generado exitosamente',
          'success',
        );
        this.generated.emit();
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Error al generar el lote de prefacturas';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
