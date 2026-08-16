import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import {
  ICreateRouteDto,
  IReadingRoute,
  IUpdateRouteDto,
  TipoRuta,
} from '../../interfaces/ireading-route.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-route-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-form-modal.component.html',
  styleUrl: './route-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteFormModalComponent implements OnInit {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);

  readonly route = input<IReadingRoute | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  nombre = '';
  descripcion = '';
  tipoRuta: TipoRuta = 'TOMA_LECTURA';
  operarioId = 1;
  comunidadId = 1;
  sectorId: number | null = null;
  periodoId = 1;
  fechaPlanificada = '';
  isLoading = false;

  readonly tipoOptions: { value: TipoRuta; label: string }[] = [
    { value: 'TOMA_LECTURA', label: 'Toma de Lectura' },
    { value: 'RECONEXION', label: 'Reconexión' },
    { value: 'INSTALACION', label: 'Instalación' },
    { value: 'INSPECCION', label: 'Inspección' },
  ];

  ngOnInit(): void {
    const r = this.route();
    if (r) {
      this.nombre = r.nombre;
      this.descripcion = r.descripcion || '';
      this.tipoRuta = r.tipoRuta as TipoRuta;
      this.operarioId = r.operarioId;
      this.comunidadId = r.comunidadId;
      this.sectorId = r.sectorId ?? null;
      this.periodoId = r.periodoId ?? 1;
      this.fechaPlanificada = r.fechaPlanificada
        ? r.fechaPlanificada.split('T')[0]
        : '';
    } else {
      this.fechaPlanificada = new Date().toISOString().split('T')[0];
    }
  }

  get isFormValid(): boolean {
    return this.nombre.trim().length >= 3 && this.operarioId > 0 && this.comunidadId > 0 && this.periodoId > 0;
  }

  submit(): void {
    if (!this.isFormValid || this.isLoading) return;

    this.isLoading = true;
    const isEdit = !!this.route();

    if (isEdit) {
      const updateDto: IUpdateRouteDto = {
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim() || undefined,
        tipoRuta: this.tipoRuta,
        operarioId: Number(this.operarioId),
        comunidadId: Number(this.comunidadId),
        sectorId: this.sectorId ? Number(this.sectorId) : undefined,
        periodoId: Number(this.periodoId),
        fechaPlanificada: this.fechaPlanificada || undefined,
      };

      this.routesService.updateRoute(this.route()!.rutaId, updateDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Ruta actualizada exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al actualizar ruta';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
    } else {
      const createDto: ICreateRouteDto = {
        nombre: this.nombre.trim(),
        descripcion: this.descripcion.trim() || undefined,
        tipoRuta: this.tipoRuta,
        operarioId: Number(this.operarioId),
        comunidadId: Number(this.comunidadId),
        sectorId: this.sectorId ? Number(this.sectorId) : undefined,
        periodoId: Number(this.periodoId),
        fechaPlanificada: this.fechaPlanificada || undefined,
      };

      this.routesService.createRoute(createDto).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Ruta creada exitosamente', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || 'Error al crear ruta';
          this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
