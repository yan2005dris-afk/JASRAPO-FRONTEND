import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
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
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { User } from '../../../../users/models/user.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { PeriodPickerComponent } from '../../../../../shared/components/period-picker/period-picker.component';
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';

@Component({
  selector: 'app-route-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, PeriodPickerComponent],
  templateUrl: './route-form-modal.component.html',
  styleUrl: './route-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'close()',
  },
})
export class RouteFormModalComponent implements OnInit {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly sectoresService = inject(SectoresService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  readonly route = input<IReadingRoute | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  // Catalogs Signals
  readonly operarios = signal<User[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);
  readonly sectores = signal<Sectores[]>([]);

  // Form State Signals
  readonly nombre = signal<string>('');
  readonly descripcion = signal<string>('');
  readonly tipoRuta = signal<TipoRuta>('TOMA_LECTURA');
  readonly operarioId = signal<number | null>(null);
  readonly comunidadId = signal<number | null>(null);
  readonly sectorId = signal<number | null>(null);
  readonly periodoId = signal<number | null>(null);
  readonly fechaPlanificada = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  readonly tipoOptions: { value: TipoRuta; label: string }[] = [
    { value: 'TOMA_LECTURA', label: 'Toma de Lectura' },
    { value: 'RECONEXION', label: 'Reconexión' },
    { value: 'INSTALACION', label: 'Instalación' },
    { value: 'INSPECCION', label: 'Inspección' },
  ];

  // Computed Sectores based on selected Comunidad
  readonly filteredSectores = computed(() => {
    const selectedComId = this.comunidadId();
    if (!selectedComId) return this.sectores();
    return this.sectores().filter((s) => !s.comunidadId || s.comunidadId === selectedComId);
  });

  // Computed Form Validity
  readonly isFormValid = computed(() => {
    const n = this.nombre().trim();
    const op = this.operarioId();
    const com = this.comunidadId();
    const per = this.periodoId();
    return (
      n.length >= 3 && op !== null && op > 0 && com !== null && com > 0 && per !== null && per > 0
    );
  });

  ngOnInit(): void {
    this.loadCatalogs();

    const r = this.route();
    if (r) {
      this.nombre.set(r.nombre);
      this.descripcion.set(r.descripcion || '');
      this.tipoRuta.set(r.tipoRuta as TipoRuta);
      this.operarioId.set(r.operarioId);
      this.comunidadId.set(r.comunidadId);
      this.sectorId.set(r.sectorId ?? null);
      this.periodoId.set(r.periodoId ?? null);
      this.fechaPlanificada.set(r.fechaPlanificada ? r.fechaPlanificada.split('T')[0] : '');
    } else {
      this.fechaPlanificada.set(new Date().toISOString().split('T')[0]);
    }
  }

  loadCatalogs(): void {
    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => {
        this.comunidades.set(res.data);
      },
    });

    this.sectoresService.getAllSectores(1, 100).subscribe({
      next: (res) => {
        this.sectores.set(res.data);
      },
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        const filtered = res.data.filter((u) => {
          const roleName = u.rol?.nombre?.toLowerCase() || '';
          return roleName.includes('operador') || roleName.includes('operario');
        });
        this.operarios.set(filtered);
      },
    });
  }

  onPeriodSelected(period: IAccountingPeriod | null): void {
    this.periodoId.set(period ? period.periodoId : null);
  }

  onComunidadChange(newComunidadId: number | null): void {
    this.comunidadId.set(newComunidadId);
    // Reset sector if it does not belong to new comunidad
    if (this.sectorId()) {
      const valid = this.filteredSectores().some((s) => s.sectorId === this.sectorId());
      if (!valid) {
        this.sectorId.set(null);
      }
    }
  }

  save(): void {
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    const r = this.route();

    if (r) {
      const dto: IUpdateRouteDto = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        tipoRuta: this.tipoRuta(),
        operarioId: this.operarioId()!,
        comunidadId: this.comunidadId()!,
        sectorId: this.sectorId() || undefined,
        periodoId: this.periodoId()!,
        fechaPlanificada: this.fechaPlanificada() || undefined,
      };

      this.routesService.updateRoute(r.rutaId, dto).subscribe({
        next: () => {
          this.toastService.show('Ruta actualizada exitosamente', 'success');
          this.isLoading.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show(err.error?.message || 'Error al actualizar la ruta', 'error');
        },
      });
    } else {
      const dto: ICreateRouteDto = {
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        tipoRuta: this.tipoRuta(),
        operarioId: this.operarioId()!,
        comunidadId: this.comunidadId()!,
        sectorId: this.sectorId() || undefined,
        periodoId: this.periodoId()!,
        fechaPlanificada: this.fechaPlanificada() || undefined,
      };

      this.routesService.createRoute(dto).subscribe({
        next: () => {
          this.toastService.show('Ruta creada exitosamente', 'success');
          this.isLoading.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show(err.error?.message || 'Error al crear la ruta', 'error');
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
