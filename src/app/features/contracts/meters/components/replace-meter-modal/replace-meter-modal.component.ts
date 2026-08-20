import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
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
export class ReplaceMeterModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly metersService = inject(MetersService);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);

  private triggerElement: HTMLElement | null = null;
  private readonly searchSubject$ = new Subject<{ query: string; page: number; limit: number }>();
  private searchSubscription?: Subscription;

  readonly modalContainer = viewChild<ElementRef<HTMLElement>>('modalContainer');
  readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('firstInput');
  readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

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
    mesOrigen: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    periodoDestinoId: [null as number | null],
    mesDestino: [null as number | null],
  });

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isSaving()) return;
    this.onClose();
  }

  @HostListener('keydown', ['$event'])
  handleFocusTrap(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = this.elementRef.nativeElement.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) as NodeListOf<HTMLElement>;

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
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

  isDestinationCycleValid(): boolean {
    if (this.form.controls.tratamientoEntrante.value !== 'DIFERIR_SIGUIENTE_PERIODO') {
      return true;
    }
    const pOrig = Number(this.form.controls.periodoOrigenId.value);
    const pDest = Number(this.form.controls.periodoDestinoId.value);
    const mOrig = Number(this.form.controls.mesOrigen.value);
    const mDest = Number(this.form.controls.mesDestino.value);

    if (!pDest || !mDest) return false;
    if (pDest < pOrig) return false;
    if (pDest === pOrig && mDest <= mOrig) return false;
    return true;
  }

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
    if (typeof document !== 'undefined') {
      this.triggerElement = document.activeElement as HTMLElement;
    }
    this.setupSearchPipeline();
    this.setupReactiveValidators();
    this.loadAvailableMeters(true);
    this.loadPeriods();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.firstInput()?.nativeElement?.focus();
    }, 50);
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }
  }

  private setupSearchPipeline(): void {
    this.searchSubscription = this.searchSubject$
      .pipe(
        debounceTime(250),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        tap(() => this.isLoadingMeters.set(true)),
        switchMap(({ query, page, limit }) =>
          this.metersService.getMeters({
            estado: 'BODEGA',
            search: query || undefined,
            page,
            limit,
          }),
        ),
      )
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
          this.cdr.markForCheck();
        },
      });
  }

  private recalculateDeferredCycle(): void {
    if (this.form.controls.tratamientoEntrante.value !== 'DIFERIR_SIGUIENTE_PERIODO') return;
    const currentMonth = Number(this.form.controls.mesOrigen.value) || new Date().getMonth() + 1;
    const currentPeriodId = Number(this.form.controls.periodoOrigenId.value);
    const allPeriods = this.periodos();

    if (currentMonth === 12) {
      this.form.controls.mesDestino.setValue(1);
      const nextPeriod = allPeriods.find((p) => p.periodoId > currentPeriodId);
      if (nextPeriod) {
        this.form.controls.periodoDestinoId.setValue(nextPeriod.periodoId);
      } else {
        this.form.controls.periodoDestinoId.setValue(currentPeriodId);
      }
    } else {
      this.form.controls.mesDestino.setValue(currentMonth + 1);
      this.form.controls.periodoDestinoId.setValue(currentPeriodId);
    }
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

    this.form.controls.mesOrigen.valueChanges.subscribe(() => {
      this.recalculateDeferredCycle();
    });

    this.form.controls.periodoOrigenId.valueChanges.subscribe(() => {
      this.recalculateDeferredCycle();
    });

    this.form.controls.tratamientoEntrante.valueChanges.subscribe((t) => {
      if (t === 'DIFERIR_SIGUIENTE_PERIODO') {
        this.form.controls.periodoDestinoId.setValidators([Validators.required]);
        this.form.controls.mesDestino.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(12),
        ]);
        this.recalculateDeferredCycle();
      } else {
        this.form.controls.periodoDestinoId.clearValidators();
        this.form.controls.mesDestino.clearValidators();
      }
      this.form.controls.periodoDestinoId.updateValueAndValidity();
      this.form.controls.mesDestino.updateValueAndValidity();
    });
  }

  loadAvailableMeters(immediate = false): void {
    const params = {
      estado: 'BODEGA' as const,
      search: this.meterSearchQuery().trim() || undefined,
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (immediate) {
      this.isLoadingMeters.set(true);
      this.metersService.getMeters(params).subscribe({
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
          this.cdr.markForCheck();
        },
      });
    } else {
      this.searchSubject$.next({
        query: this.meterSearchQuery().trim(),
        page: this.currentPage(),
        limit: this.pageSize(),
      });
    }
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
    this.loadAvailableMeters(false);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAvailableMeters(true);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadAvailableMeters(true);
  }

  selectMeter(meter: IMeter): void {
    if (!meter) return;
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
    setTimeout(() => {
      this.stepHeading()?.nativeElement?.focus();
    }, 50);
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

    if (!this.isDestinationCycleValid()) {
      this.errorMessage.set(
        'El ciclo de facturación destino (período y mes) debe ser estrictamente posterior al ciclo de origen.',
      );
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
      tratamientoEntrante: (raw.tratamientoEntrante || 'FACTURAR_PERIODO_ACTUAL') as TratamientoEntrante,
      porcentajeCobro: raw.tratamientoSaliente === 'COBRO_PARCIAL' ? Number(raw.porcentajeCobro) : undefined,
      ventanaPromedio: raw.tratamientoSaliente === 'PROMEDIO_HISTORICO' ? Number(raw.ventanaPromedio) : undefined,
      periodoOrigenId: Number(raw.periodoOrigenId),
      mesOrigen: Number(raw.mesOrigen) || undefined,
      periodoDestinoId: raw.periodoDestinoId ? Number(raw.periodoDestinoId) : undefined,
      mesDestino: raw.mesDestino ? Number(raw.mesDestino) : undefined,
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
    if (this.isSaving()) return;
    this.cancelled.emit();
  }
}
