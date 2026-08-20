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
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
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
  /** Clave de idempotencia de la operación: se genera una vez por apertura del modal
   *  y se reutiliza en reintentos para que el backend deduplique reenvíos. */
  private idempotencyKey: string = '';

  readonly modalContainer = viewChild<ElementRef<HTMLElement>>('modalContainer');
  readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('firstInput');
  readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  readonly contract = input.required<IContract>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  // Wizard state
  readonly currentStep = signal<1 | 2 | 3 | 4>(1);
  // Steps the user has tried to advance past (drives per-field error visibility)
  private readonly attemptedSteps = signal<Set<number>>(new Set());

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
    mesOrigen: [
      new Date().getMonth() + 1,
      [Validators.required, Validators.min(1), Validators.max(12)],
    ],
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
    if (
      h?.ultimaLecturaAprobada?.lecturaActual !== null &&
      h?.ultimaLecturaAprobada?.lecturaActual !== undefined
    ) {
      return Number(h.ultimaLecturaAprobada.lecturaActual);
    }
    if (h?.lecturaFinal !== null && h?.lecturaFinal !== undefined) {
      return Number(h.lecturaFinal);
    }
    if (h?.lecturaInicial !== null && h?.lecturaInicial !== undefined) {
      return Number(h.lecturaInicial);
    }
    return 0;
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

  stepAttempted(step: number): boolean {
    return this.attemptedSteps().has(step);
  }

  private markStepAttempted(step: number): void {
    const next = new Set(this.attemptedSteps());
    next.add(step);
    this.attemptedSteps.set(next);
  }

  // Per-field validation helpers (used by the template to show messages under each input)
  readingBelowBase(): boolean {
    return Number(this.form.controls.lecturaFinalSaliente.value) < this.baseReading();
  }

  missingMotivo(): boolean {
    return !this.form.controls.motivo.value;
  }

  missingResponsabilidad(): boolean {
    const motivo = this.form.controls.motivo.value;
    if (motivo !== 'DANO') return false;
    const resp = this.form.controls.responsabilidadDano.value;
    return !resp || resp === 'NO_APLICA';
  }

  missingDetalleMotivo(): boolean {
    return (
      this.form.controls.motivo.value === 'OTRO' &&
      !this.form.controls.detalleMotivo.value?.trim()
    );
  }

  missingMeter(): boolean {
    return !this.form.controls.nuevoMedidorId.value;
  }

  negativeInitialReading(): boolean {
    return Number(this.form.controls.lecturaInicialEntrante.value) < 0;
  }

  missingPeriodoOrigen(): boolean {
    return !this.form.controls.periodoOrigenId.value;
  }

  invalidMesOrigen(): boolean {
    const m = Number(this.form.controls.mesOrigen.value);
    return !m || m < 1 || m > 12;
  }

  missingPeriodoDestino(): boolean {
    return (
      this.form.controls.tratamientoEntrante.value === 'DIFERIR_SIGUIENTE_PERIODO' &&
      !this.form.controls.periodoDestinoId.value
    );
  }

  missingMesDestino(): boolean {
    return (
      this.form.controls.tratamientoEntrante.value === 'DIFERIR_SIGUIENTE_PERIODO' &&
      !this.form.controls.mesDestino.value
    );
  }

  invalidPorcentaje(): boolean {
    if (this.form.controls.tratamientoSaliente.value !== 'COBRO_PARCIAL') return false;
    const pct = Number(this.form.controls.porcentajeCobro.value);
    return !pct || pct < 1 || pct > 100;
  }

  missingVentana(): boolean {
    return (
      this.form.controls.tratamientoSaliente.value === 'PROMEDIO_HISTORICO' &&
      !this.form.controls.ventanaPromedio.value
    );
  }

  // Centralized full-transaction validation, used by step 4 summary and onSubmit guard
  getStepErrors(): { step: number; message: string }[] {
    const errors: { step: number; message: string }[] = [];
    const controls = this.form.controls;
    const base = this.baseReading();
    const finalSaliente = Number(controls.lecturaFinalSaliente.value);
    const motivo = controls.motivo.value as MotivoReemplazoMedidor | null;
    const detalle = controls.detalleMotivo.value;
    const resp = controls.responsabilidadDano.value;
    const meterId = controls.nuevoMedidorId.value;
    const initialReading = Number(controls.lecturaInicialEntrante.value);
    const ts = controls.tratamientoSaliente.value as TratamientoSaliente | null;
    const te = controls.tratamientoEntrante.value as TratamientoEntrante | null;
    const pct = Number(controls.porcentajeCobro.value);
    const ventana = Number(controls.ventanaPromedio.value);

    // Paso 1
    if (!motivo) {
      errors.push({ step: 1, message: 'Seleccione el motivo del reemplazo.' });
    }
    if (finalSaliente < base) {
      errors.push({
        step: 1,
        message: `La lectura final (${finalSaliente}) no puede ser menor a la lectura base (${base}).`,
      });
    }
    if (motivo === 'DANO' && (!resp || resp === 'NO_APLICA')) {
      errors.push({ step: 1, message: 'Seleccione la responsabilidad del daño.' });
    }
    if (motivo === 'OTRO' && !detalle?.trim()) {
      errors.push({ step: 1, message: 'Especifique el detalle del motivo.' });
    }

    // Paso 2
    if (!meterId) {
      errors.push({ step: 2, message: 'Seleccione un medidor entrante de la lista.' });
    }
    if (initialReading < 0) {
      errors.push({ step: 2, message: 'La lectura inicial no puede ser negativa.' });
    }

    // Paso 3
    if (!controls.periodoOrigenId.value) {
      errors.push({ step: 3, message: 'Seleccione el período de facturación (origen).' });
    }
    const mOrig = Number(controls.mesOrigen.value);
    if (!mOrig || mOrig < 1 || mOrig > 12) {
      errors.push({ step: 3, message: 'Seleccione el mes de origen.' });
    }
    if (te === 'DIFERIR_SIGUIENTE_PERIODO') {
      if (!controls.periodoDestinoId.value) {
        errors.push({ step: 3, message: 'Seleccione el período destino (diferimiento).' });
      }
      if (!controls.mesDestino.value) {
        errors.push({ step: 3, message: 'Seleccione el mes destino (diferimiento).' });
      }
      if (!this.isDestinationCycleValid()) {
        errors.push({
          step: 3,
          message: 'El ciclo destino debe ser posterior al ciclo de origen.',
        });
      }
    }
    if (ts === 'COBRO_PARCIAL' && (!pct || pct < 1 || pct > 100)) {
      errors.push({
        step: 3,
        message: 'El porcentaje a cobrar debe estar entre 1 y 100.',
      });
    }
    if (ts === 'PROMEDIO_HISTORICO' && !ventana) {
      errors.push({ step: 3, message: 'Seleccione la ventana de cálculo del promedio.' });
    }

    return errors;
  }

  step1Valid(): boolean {
    const finalSaliente = Number(this.form.controls.lecturaFinalSaliente.value);
    const motivo = this.form.controls.motivo.value;
    const detalle = this.form.controls.detalleMotivo.value;
    const resp = this.form.controls.responsabilidadDano.value;

    if (finalSaliente < this.baseReading()) return false;
    if (motivo === 'OTRO' && !detalle?.trim()) return false;
    if (motivo === 'DANO' && (!resp || resp === 'NO_APLICA')) return false;
    return !!motivo;
  }

  step2Valid(): boolean {
    const meterId = this.form.controls.nuevoMedidorId.value;
    const initialReading = Number(this.form.controls.lecturaInicialEntrante.value);
    return !!meterId && initialReading >= 0;
  }

  ngOnInit(): void {
    this.idempotencyKey = crypto.randomUUID();
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
        tap(() => {
          this.isLoadingMeters.set(true);
          this.cdr.markForCheck();
        }),
        switchMap(({ query, page, limit }) =>
          this.metersService
            .getMeters({
              estado: 'BODEGA' as const,
              search: query || undefined,
              page,
              limit,
            })
            .pipe(
              catchError(() => {
                this.isLoadingMeters.set(false);
                this.toastService.show('Error al cargar medidores en bodega', 'error');
                this.cdr.markForCheck();
                return of({ data: [], datos: [], meta: { total: 0 } });
              }),
            ),
        ),
      )
      .subscribe({
        next: (res) => {
          const rawList = res.data || res.datos || [];
          const list = rawList as IMeter[];
          this.availableMeters.set(list);
          const total = res.meta?.total ?? list.length;
          this.totalMeters.set(total);
          this.isLoadingMeters.set(false);
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
      const nextPeriod = allPeriods
        .filter((p) => p.periodoId > currentPeriodId)
        .sort((a, b) => a.periodoId - b.periodoId)[0];
      if (nextPeriod) {
        this.form.controls.periodoDestinoId.setValue(nextPeriod.periodoId);
      } else {
        this.form.controls.periodoDestinoId.setValue(null);
      }
    } else {
      this.form.controls.mesDestino.setValue(currentMonth + 1);
      this.form.controls.periodoDestinoId.setValue(currentPeriodId);
    }
  }

  private setupReactiveValidators(): void {
    this.form.controls.motivo.valueChanges.subscribe((m) => {
      if (m === 'DANO') {
        this.form.controls.responsabilidadDano.setValue('JUNTA');
        this.form.controls.responsabilidadDano.setValidators([Validators.required]);
      } else {
        this.form.controls.responsabilidadDano.setValue('NO_APLICA');
        this.form.controls.responsabilidadDano.clearValidators();
      }
      this.form.controls.responsabilidadDano.updateValueAndValidity();

      if (m === 'OTRO') {
        this.form.controls.detalleMotivo.setValidators([Validators.required]);
      } else {
        this.form.controls.detalleMotivo.clearValidators();
      }
      this.form.controls.detalleMotivo.updateValueAndValidity();
    });

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
    if (immediate) {
      this.isLoadingMeters.set(true);
      this.metersService
        .getMeters({
          estado: 'BODEGA' as const,
          search: this.meterSearchQuery().trim() || undefined,
          page: this.currentPage(),
          limit: this.pageSize(),
        })
        .pipe(
          catchError(() => {
            this.isLoadingMeters.set(false);
            this.toastService.show('Error al cargar medidores en bodega', 'error');
            this.cdr.markForCheck();
            return of({ data: [], datos: [], meta: { total: 0 } });
          }),
        )
        .subscribe((res) => {
          const rawList = res.data || res.datos || [];
          const list = rawList as IMeter[];
          this.availableMeters.set(list);
          const total = res.meta?.total ?? list.length;
          this.totalMeters.set(total);
          this.isLoadingMeters.set(false);
          this.cdr.markForCheck();
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
    this.loadAvailableMeters();
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

  goToStep(step: 1 | 2 | 3 | 4): void {
    const current = this.currentStep();
    // Only enforce validation when moving FORWARD (back navigation is always allowed)
    if (step > current) {
      const currentErrors = this.getStepErrors().filter((e) => e.step === current);
      if (currentErrors.length > 0) {
        this.markStepAttempted(current);
        this.errorMessage.set(currentErrors[0].message);
        return;
      }
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
    if (step === 4) this.currentStep.set(3);
    this.errorMessage.set('');
    setTimeout(() => {
      this.stepHeading()?.nativeElement?.focus();
    }, 50);
  }

  goToErrorStep(step: number): void {
    this.goToStep(Math.min(4, Math.max(1, step)) as 1 | 2 | 3 | 4);
  }

  readonly Number = Number;

  onSubmit(): void {
    const raw = this.form.getRawValue();

    const errors = this.getStepErrors();
    if (errors.length > 0) {
      this.form.markAllAsTouched();
      errors.forEach((e) => this.markStepAttempted(e.step));
      const first = errors[0];
      this.currentStep.set(first.step as 1 | 2 | 3);
      this.errorMessage.set(first.message);
      setTimeout(() => {
        this.stepHeading()?.nativeElement?.focus();
      }, 50);
      return;
    }

    const finalSaliente = Number(raw.lecturaFinalSaliente);

    this.errorMessage.set('');
    this.isSaving.set(true);

    const payload: IReplaceMeterRequest = {
      claveIdempotencia: this.idempotencyKey,
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
        const msg = this.formatServerError(err);
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

  /**
   * El GlobalExceptionFilter del backend responde 400 con
   * { message: 'Error de validación', errors: [...] } donde errors[] lleva el detalle
   * por campo. Aquí se prefiere ese detalle sobre el mensaje genérico.
   */
  private formatServerError(err: unknown): string {
    const errorBody = (err as { error?: { message?: string; errors?: unknown } })?.error;
    const fallback = 'Error al procesar el reemplazo del medidor';
    if (!errorBody) return fallback;

    const rawErrors = errorBody.errors;
    if (Array.isArray(rawErrors) && rawErrors.length > 0) {
      const details = rawErrors
        .map((e) => {
          if (typeof e === 'string') return e;
          const field = (e as { field?: string })?.field;
          const message = (e as { message?: string })?.message;
          if (message) return field ? `${field}: ${message}` : message;
          return undefined;
        })
        .filter((m): m is string => !!m);
      if (details.length > 0) return details.join(' · ');
    }

    return errorBody.message || fallback;
  }
}
