import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MeterTableComponent } from '../../../../../shared/components/meter-table/meter-table.component';

@Component({
  selector: 'app-replace-meter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MeterTableComponent],
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

  // Wizard state
  readonly currentStep = signal<1 | 2 | 3>(1);

  // Search & Pagination in Step 2 (Server-side)
  readonly meterSearchQuery = signal<string>('');
  readonly availableMeters = signal<IMeter[]>([]);
  readonly totalMeters = signal<number>(0);
  readonly isLoadingMeters = signal<boolean>(false);
  readonly selectedNewMeter = signal<IMeter | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

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
    porcentajeCobro: [100 as number | null],
    ventanaPromedio: [3 as number | null],
    periodoOrigenId: [null as number | null, [Validators.required]],
    periodoDestinoId: [null as number | null],
  });

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.onClose();
  }

  readonly currentHistorial = computed(() => {
    const c = this.contract();
    if (!c || !c.historialMedidores) return null;
    return c.historialMedidores.find((h) => !h.fechaHasta) || null;
  });

  readonly baseReading = computed(() => {
    const h = this.currentHistorial();
    return h?.lecturaInicial !== undefined ? Number(h.lecturaInicial) : 0;
  });

  step1Valid(): boolean {
    const finalSaliente = Number(this.form.controls.lecturaFinalSaliente.value);
    const motivo = this.form.controls.motivo.value;
    const detalle = this.form.controls.detalleMotivo.value;
    if (finalSaliente < this.baseReading()) return false;
    if (motivo === 'OTRO' && !detalle?.trim()) return false;
    return !!motivo;
  }

  step2Valid(): boolean {
    const meterId = this.form.controls.nuevoMedidorId.value;
    const initialReading = Number(this.form.controls.lecturaInicialEntrante.value);
    return !!meterId && initialReading >= 0;
  }

  ngOnInit(): void {
    this.setupReactiveValidators();
    this.loadAvailableMeters();
    this.loadPeriods();
  }

  private setupReactiveValidators(): void {
    this.form.controls.tratamientoSaliente.valueChanges.subscribe((t) => {
      if (t === 'COBRO_PARCIAL') {
        this.form.controls.porcentajeCobro.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(100),
        ]);
      } else {
        this.form.controls.porcentajeCobro.clearValidators();
      }
      this.form.controls.porcentajeCobro.updateValueAndValidity();
    });

    this.form.controls.tratamientoEntrante.valueChanges.subscribe((t) => {
      if (t === 'DIFERIR_SIGUIENTE_PERIODO') {
        this.form.controls.periodoDestinoId.setValidators([Validators.required]);
      } else {
        this.form.controls.periodoDestinoId.clearValidators();
      }
      this.form.controls.periodoDestinoId.updateValueAndValidity();
    });
  }

  loadAvailableMeters(): void {
    this.isLoadingMeters.set(true);
    const query = this.meterSearchQuery().trim();
    this.metersService
      .getMeters({
        estado: 'BODEGA',
        search: query || undefined,
        page: this.currentPage(),
        limit: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          const list = (res.datos || res.data || []) as IMeter[];
          this.availableMeters.set(list);
          const total = res.meta?.total ?? res.paginacion?.total ?? list.length;
          this.totalMeters.set(total);
          this.isLoadingMeters.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingMeters.set(false);
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

  onSearchQueryChange(query: string): void {
    this.meterSearchQuery.set(query);
    this.currentPage.set(1);
    this.loadAvailableMeters();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAvailableMeters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadAvailableMeters();
  }

  selectMeter(meter: IMeter): void {
    this.selectedNewMeter.set(meter);
    this.form.controls.nuevoMedidorId.setValue(String(meter.medidorId));
    this.errorMessage.set('');
  }

  goToStep(step: 1 | 2 | 3): void {
    if (step === 2 && !this.step1Valid()) {
      const finalSaliente = Number(this.form.controls.lecturaFinalSaliente.value);
      if (finalSaliente < this.baseReading()) {
        this.errorMessage.set(
          `La lectura final (${finalSaliente}) no puede ser menor a la lectura base previa (${this.baseReading()}).`,
        );
      } else {
        this.errorMessage.set('Complete los campos requeridos del Paso 1.');
      }
      return;
    }

    if (step === 3 && !this.step2Valid()) {
      this.errorMessage.set('Debe seleccionar un medidor de la lista en el Paso 2.');
      return;
    }

    this.errorMessage.set('');
    this.currentStep.set(step);
  }

  goBack(): void {
    const step = this.currentStep();
    if (step === 2) this.currentStep.set(1);
    if (step === 3) this.currentStep.set(2);
    this.errorMessage.set('');
  }

  readonly Number = Number;

  onSubmit(): void {
    const raw = this.form.getRawValue();
    const finalSaliente = Number(raw.lecturaFinalSaliente);
    const base = this.baseReading();

    if (finalSaliente < base) {
      this.errorMessage.set(
        `La lectura final (${finalSaliente}) no puede ser menor a la lectura inicial registrada (${base}).`,
      );
      this.currentStep.set(1);
      return;
    }

    if (!raw.nuevoMedidorId) {
      this.errorMessage.set('Debe seleccionar un medidor entrante.');
      this.currentStep.set(2);
      return;
    }

    if (this.form.invalid || !raw.periodoOrigenId) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (raw.motivo === 'OTRO' && !raw.detalleMotivo?.trim()) {
      this.errorMessage.set('Debe especificar un detalle cuando el motivo es OTRO.');
      this.currentStep.set(1);
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
