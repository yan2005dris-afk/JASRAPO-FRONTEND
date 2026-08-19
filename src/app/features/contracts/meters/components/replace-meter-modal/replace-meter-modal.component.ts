import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MetersService } from '../../services/meters.service';
import {
  IMeter,
  IReplaceMeterRequest,
  MotivoReemplazoMedidor,
  ResponsabilidadDano,
  TratamientoSaliente,
  TratamientoEntrante,
} from '../../interfaces/imeter.interface';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { ReadingRoutesService } from '../../../reading-routes/services/reading-routes.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-replace-meter-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './replace-meter-modal.component.html',
  styleUrl: './replace-meter-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplaceMeterModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly metersService = inject(MetersService);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly contract = input.required<IContract>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly availableMeters = signal<IMeter[]>([]);
  readonly periodos = signal<{ periodoId: number; nombre?: string; estado: string }[]>([]);
  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly form = this.fb.group({
    nuevoMedidorId: ['', [Validators.required]],
    lecturaFinalSaliente: [0, [Validators.required, Validators.min(0)]],
    lecturaInicialEntrante: [0, [Validators.required, Validators.min(0)]],
    motivo: ['DANO' as MotivoReemplazoMedidor, [Validators.required]],
    responsabilidadDano: ['NO_APLICA' as ResponsabilidadDano],
    detalleMotivo: [''],
    tratamientoSaliente: ['COBRO_REAL' as TratamientoSaliente, [Validators.required]],
    tratamientoEntrante: ['FACTURAR_PERIODO_ACTUAL' as TratamientoEntrante, [Validators.required]],
    porcentajeCobro: [100],
    ventanaPromedio: [3],
    periodoOrigenId: [null as number | null, [Validators.required]],
    periodoDestinoId: [null as number | null],
  });

  readonly currentHistorial = computed(() => {
    const c = this.contract();
    if (!c || !c.historialMedidores) return null;
    return c.historialMedidores.find((h) => !h.fechaHasta) || null;
  });

  readonly baseReading = computed(() => {
    const h = this.currentHistorial();
    return h?.lecturaInicial !== undefined ? Number(h.lecturaInicial) : 0;
  });

  ngOnInit(): void {
    this.loadAvailableMeters();
    this.loadPeriods();
  }

  private loadAvailableMeters(): void {
    this.metersService.getMeters({ estado: 'BODEGA', limit: 100 }).subscribe({
      next: (res) => {
        this.availableMeters.set((res.datos || res.data || []) as IMeter[]);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.show('Error al cargar medidores en bodega', 'error');
      },
    });
  }

  private loadPeriods(): void {
    this.routesService.getPeriods().subscribe({
      next: (res) => {
        this.periodos.set(res || []);
        const active = res.find((p) => p.estado === 'ABIERTO');
        if (active) {
          this.form.controls.periodoOrigenId.setValue(active.periodoId);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.show('Error al cargar períodos de facturación', 'error');
      },
    });
  }

  onSubmit(): void {
    const raw = this.form.getRawValue();
    const finalSaliente = Number(raw.lecturaFinalSaliente);
    const base = this.baseReading();

    if (finalSaliente < base) {
      this.errorMessage.set(
        `La lectura final (${finalSaliente}) no puede ser menor a la lectura inicial registrada (${base}).`,
      );
      return;
    }

    if (this.form.invalid || !raw.nuevoMedidorId || !raw.periodoOrigenId) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (raw.motivo === 'OTRO' && !raw.detalleMotivo?.trim()) {
      this.errorMessage.set('Debe especificar un detalle cuando el motivo es OTRO.');
      return;
    }

    this.errorMessage.set('');
    this.isSaving.set(true);

    const payload: IReplaceMeterRequest = {
      contratoId: this.contract().contratoId,
      nuevoMedidorId: String(raw.nuevoMedidorId),
      lecturaFinalSaliente: finalSaliente,
      lecturaInicialEntrante: Number(raw.lecturaInicialEntrante || 0),
      motivo: (raw.motivo || 'DANO') as MotivoReemplazoMedidor,
      responsabilidadDano: (raw.responsabilidadDano || 'NO_APLICA') as ResponsabilidadDano,
      detalleMotivo: raw.detalleMotivo || undefined,
      tratamientoSaliente: (raw.tratamientoSaliente || 'COBRO_REAL') as TratamientoSaliente,
      tratamientoEntrante: (raw.tratamientoEntrante ||
        'FACTURAR_PERIODO_ACTUAL') as TratamientoEntrante,
      porcentajeCobro:
        raw.tratamientoSaliente === 'COBRO_PARCIAL' ? Number(raw.porcentajeCobro) : undefined,
      ventanaPromedio:
        raw.tratamientoSaliente === 'PROMEDIO_HISTORICO' ? Number(raw.ventanaPromedio) : undefined,
      periodoOrigenId: Number(raw.periodoOrigenId),
      periodoDestinoId: raw.periodoDestinoId ? Number(raw.periodoDestinoId) : undefined,
    };

    this.metersService.replaceMeter(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.show('Medidor reemplazado y registrado exitosamente', 'success');
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err?.error?.message || 'Error al procesar el reemplazo del medidor';
        this.errorMessage.set(msg);
        this.toastService.show(msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  onClose(): void {
    this.cancelled.emit();
  }
}
