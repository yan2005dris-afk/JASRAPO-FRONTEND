import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OperatorService } from '../service/operator.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { MeterCacheService } from '../../../core/services/meter-cache.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture.component';
import { MeterSearchBoxComponent } from '../components/meter-search-box/meter-search-box.component';
import { MeterCardComponent } from '../components/meter-card/meter-card.component';
import { SelectedMeterCardComponent } from '../components/selected-meter-card/selected-meter-card.component';
import { RouteTypePipe } from '../../../shared/pipes/route-type.pipe';
import { firstValueFrom } from 'rxjs';
import {
  EstadoInfo,
  EstadoChip,
  MeterGroup,
  MobileStep,
  READING_STATE_ORDER,
  ESTADOS_FALLBACK,
} from './readings.models';

/** Registro de lectura proveniente del backend o IndexedDB. */
interface ReadingRecord {
  lecturaId?: string;
  _lecturaId?: string;
  medidorId?: string | number;
  medidor?: { medidorId?: string | number };
  estado?: string;
  syncState?: string;
  [key: string]: unknown;
}


@Component({
  selector: 'app-operator-readings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhotoCaptureComponent,
    MeterSearchBoxComponent,
    MeterCardComponent,
    SelectedMeterCardComponent,
    RouteTypePipe,
  ],
  templateUrl: './lecturas.component.html',
  styleUrl: './lecturas.component.scss',
})
export class LecturasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  private readonly meterCache = inject(MeterCacheService);
  private readonly toastService = inject(ToastService);
  private readonly operatorService = inject(OperatorService);
  // Mobile step flow
  readonly currentStep = signal<MobileStep>('search');

  // Catálogo de medidores cargado (memoria local)
  readonly metersList = this.meterCache.metersList;
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Lecturas registradas en el período activo (memoria local/caché)
  readonly registeredReadings = signal<ReadingRecord[]>([]);
  readonly pendingReadings = signal<ReadingRecord[]>([]);

  // IDs de medidores con lecturas en estado no editable por el operador (POR_REVISION, APROBADA, etc.)
  readonly readMetersIds = computed(() => {
    const registered = this.registeredReadings();
    const pending = this.pendingReadings();
    const ids = new Set<string>();
    for (const r of registered) {
      const mId = r.medidor?.medidorId ?? r.medidorId;
      if (mId && r.estado !== 'PENDIENTE' && r.estado !== 'RECHAZADA_VERIFICACION') {
        ids.add(mId.toString());
      }
    }
    for (const p of pending) {
      if (p.medidorId && p.estado !== 'PENDIENTE' && p.estado !== 'RECHAZADA_VERIFICACION') {
        ids.add(p.medidorId.toString());
      }
    }
    return ids;
  });

  // ========== ESTADO FILTERS & GROUPING ==========

  // Catálogo de estados cargado desde el backend (fallback hardcoded offline)
  readonly estadosCatalog = signal<EstadoInfo[]>([]);

  // Chips de filtro por estado
  readonly estadoFilterChips = computed<EstadoChip[]>(() => {
    const chips: EstadoChip[] = [{ value: 'todas', label: 'Todas', icon: 'bi-funnel' }];
    for (const e of this.estadosCatalog()) {
      chips.push({ value: e.codigo, label: e.nombre, icon: e.icono });
    }
    return chips;
  });

  // Filtro de estado activo
  readonly selectedEstadoFilter = signal<string>('todas');

  // Mapa medidorId → lectura existente (de registeredReadings + pendingReadings)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly existingReadingMap = computed<Map<string, any>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    for (const r of this.registeredReadings()) {
      // Backend response nests medidorId inside medidor object
      const mId = r.medidor?.medidorId ?? r.medidorId;
      if (mId != null) map.set(mId.toString(), r);
    }
    for (const p of this.pendingReadings()) {
      const mId = p.medidorId;
      if (mId != null) {
        map.set(mId.toString(), {
          ...map.get(mId.toString()),
          ...p,
          estado: p.estado || 'POR_REVISION',
        });
      }
    }
    return map;
  });

  // Medidores agrupados por estado de lectura
  readonly metersByEstado = computed<MeterGroup[]>(() => {
    const meters = this.filteredMeters();
    const filter = this.selectedEstadoFilter();
    const readingMap = this.existingReadingMap();
    const estadoInfo = new Map<string, { label: string; icon: string }>();
    for (const e of this.estadosCatalog()) {
      estadoInfo.set(e.codigo, { label: e.nombre, icon: e.icono });
    }

    const groups = new Map<string, IMeterDto[]>();

    for (const meter of meters) {
      const existing = readingMap.get(meter.medidorId.toString());
      const estado = existing?.estado ?? '__SIN_LECTURA__';

      if (filter !== 'todas' && estado !== filter) continue;

      if (!groups.has(estado)) groups.set(estado, []);
      groups.get(estado)!.push(meter);
    }

    // Orden consistente importado desde readings.models.ts
    return READING_STATE_ORDER
      .filter((key) => groups.has(key))
      .map((key) => {
        const isSinLectura = key === '__SIN_LECTURA__';
        const info = isSinLectura
          ? { label: 'Sin Lectura', icon: 'bi-clock', cssClass: null as string | null }
          : {
              label: estadoInfo.get(key)?.label ?? key,
              icon: estadoInfo.get(key)?.icon ?? 'bi-question',
              cssClass: `badge-${key.toLowerCase().replace(/_/g, '-')}` as string | null,
            };
        return { estado: key, info, meters: groups.get(key)! };
      });
  });

  // Previsualización de la foto capturada en Base64
  readonly photoPreview = signal<string | null>(null);

  // When navigated from a route: restricts list to those series only
  readonly allowedSeries = signal<Set<string> | null>(null);
  readonly routeContext = signal<{ nombre: string; tipo: string } | null>(null);

  // Formulario
  readingForm!: FormGroup;

  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const allowed = this.allowedSeries();
    let list = this.metersList();

    if (allowed !== null) {
      list = list.filter((m) => allowed.has(m.serie));
    }

    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)) ||
        (m.marca && m.marca.toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.initForm();
    this.loadCachedMeters();
    this.loadPendingReadings();
    this.loadEstadosCatalog();
  }

  private initForm(): void {
    this.readingForm = this.fb.group({
      lecturaAnterior: [0, [Validators.required, Validators.min(0)]],
      lecturaActual: [0, [Validators.required, Validators.min(0)]],
      lecturaInicial: [false],
      descripcionAnomalia: [''],
    });

    // Validación cruzada para asegurar que lecturaActual >= lecturaAnterior
    this.readingForm
      .get('lecturaActual')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.validateReadings();
      });

    this.readingForm
      .get('lecturaAnterior')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.validateReadings();
      });
  }

  private validateReadings(): void {
    const actual = this.readingForm.get('lecturaActual')?.value;
    const anterior = this.readingForm.get('lecturaAnterior')?.value;
    const isInicial = this.readingForm.get('lecturaInicial')?.value;

    if (!isInicial && actual < anterior) {
      this.readingForm.get('lecturaActual')?.setErrors({ lowerThanAnterior: true });
    } else {
      const errs = this.readingForm.get('lecturaActual')?.errors;
      if (errs) {
        delete errs['lowerThanAnterior'];
        if (Object.keys(errs).length === 0) {
          this.readingForm.get('lecturaActual')?.setErrors(null);
        } else {
          this.readingForm.get('lecturaActual')?.setErrors(errs);
        }
      }
    }
  }

  private async loadCachedMeters(): Promise<void> {
    try {
      await this.meterCache.load();
      const cachedReadings = await this.dbService.getRegisteredReadingsCache();
      this.registeredReadings.set(cachedReadings);
      this.autoSelectFromQueryParam();
    } catch (e) {
      console.error('Error al cargar caché offline:', e);
    }
  }

  private autoSelectFromQueryParam(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const rutaNombre = params.get('rutaNombre');
    const rutaTipo = params.get('rutaTipo');
    const seriesParam = params.get('series');
    const singleSerie = params.get('serie');

    if (rutaNombre && rutaTipo) {
      this.routeContext.set({ nombre: rutaNombre, tipo: rutaTipo });
    }

    if (seriesParam) {
      const set = new Set(
        seriesParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      this.allowedSeries.set(set);
    }

    if (singleSerie) {
      const meter = this.metersList().find((m) => m.serie === singleSerie);
      if (meter) this.selectMeter(meter);
    }
  }

  /**
   * Carga las lecturas pendientes del caché IndexedDB
   */
  private async loadPendingReadings(): Promise<void> {
    try {
      const pending = await this.dbService.getPendingReadings();
      this.pendingReadings.set(pending);
    } catch (e) {
      console.error('Error al cargar lecturas pendientes:', e);
    }
  }

  /**
   * Carga el catálogo de estados desde el backend. Si falla (offline), usa fallback hardcoded.
   */
  private async loadEstadosCatalog(): Promise<void> {
    try {
      if (this.networkService.isOnline()) {
        const estados = await this.syncService.getReadingEstados();
        // Mapear response a EstadoInfo (codigo, nombre, orden, icono)
        this.estadosCatalog.set(
          (estados as { codigo?: string; value?: string; estado?: string; nombre?: string; label?: string; orden?: number; icono?: string; icon?: string }[])
            .map((e) => ({
              codigo: e.codigo ?? e.value ?? e.estado ?? '',
              nombre: e.nombre ?? e.label ?? '',
              orden: e.orden ?? 0,
              icono: e.icono ?? e.icon ?? 'bi-question',
            })),
        );
      } else {
        throw new Error('Offline');
      }
    } catch {
      console.warn('Usando catálogo de estados offline (ESTADOS_FALLBACK)');
      this.estadosCatalog.set(ESTADOS_FALLBACK);
    }
  }

  /**
   * Descarga todos los medidores y las lecturas ya registradas, guardando todo en IndexedDB
   */
  async fetchAndCacheMeters(): Promise<void> {
    this.isLoadingMeters.set(true);
    try {
      // 1. Descargar catálogo completo de medidores para sincronización offline
      const meters = await firstValueFrom(this.operatorService.syncAllMeters());
      await this.dbService.saveMetersCache(meters);
      await this.meterCache.load();

      // 2. Descargar lecturas ya registradas en el periodo actual
      const readings = await this.syncService.getCurrentPeriodReadings();
      await this.dbService.saveRegisteredReadingsCache(readings);
      this.registeredReadings.set(readings);

      this.toastService.success(
        'Catálogo y lecturas del período actual actualizados para uso offline.',
        'Sincronizado',
      );
    } catch (err) {
      console.error('Error al sincronizar datos para offline:', err);
      this.toastService.error(
        'No se pudo actualizar el catálogo y lecturas desde el servidor.',
        'Error',
      );
    } finally {
      this.isLoadingMeters.set(false);
    }
  }

  // --- Step Navigation ---

  selectMeter(meter: IMeterDto): void {
    this.selectedMeter.set(meter);
    this.searchQuery.set('');
    this.currentStep.set('actions');

    // Intentar deducir lectura anterior
    this.readingForm.patchValue({
      lecturaAnterior: meter.contratoId ? 0 : 0,
      lecturaActual: 0,
      descripcionAnomalia: '',
    });
    this.photoPreview.set(null);
  }

  goToReadingForm(): void {
    this.currentStep.set('form');
  }

  goToNoveltyForm(): void {
    const meter = this.selectedMeter();
    if (meter) {
      const existing = this.existingReadingMap().get(meter.medidorId.toString());
      const lecturaId = existing?.lecturaId ?? existing?._lecturaId ?? null;
      this.router.navigate(['/app/operador/novedades/new'], {
        queryParams: { medidorId: meter.medidorId, lecturaId },
      });
    }
  }

  goBackToSearch(): void {
    this.selectedMeter.set(null);
    this.photoPreview.set(null);
    this.readingForm.reset({
      lecturaAnterior: 0,
      lecturaActual: 0,
      lecturaInicial: false,
      descripcionAnomalia: '',
    });
    this.currentStep.set('search');
  }

  goBackToActions(): void {
    this.currentStep.set('actions');
  }

  clearSelection(): void {
    this.goBackToSearch();
  }

  async onSubmit(): Promise<void> {
    if (this.readingForm.invalid || !this.selectedMeter()) {
      this.readingForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.readingForm.value;
    const meter = this.selectedMeter()!;

    const existingReading = this.existingReadingMap().get(meter.medidorId.toString());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      fecha: new Date().toISOString(),
      lecturaAnterior: Number(formValue.lecturaAnterior),
      lecturaActual: Number(formValue.lecturaActual),
      consumoCalculado: Number(formValue.lecturaActual) - Number(formValue.lecturaAnterior),
      medidorId: meter.medidorId.toString(),
      lecturaInicial: !!formValue.lecturaInicial,
      ...(formValue.descripcionAnomalia
        ? { descripcionAnomalia: formValue.descripcionAnomalia }
        : {}),
      ...(this.photoPreview() ? { fotoBase64: this.photoPreview() } : {}),
    };

    if (existingReading?.lecturaId) {
      payload._lecturaId = existingReading.lecturaId;
    }

    try {
      const response = await this.syncService.submitReading(payload);

      if (this.networkService.isOnline() && response && response.lecturaId) {
        const currentReadings = await this.dbService.getRegisteredReadingsCache();
        const updated = currentReadings.map((r) =>
          r.lecturaId === response.lecturaId ? response : r,
        );
        if (!currentReadings.some((r) => r.lecturaId === response.lecturaId)) {
          updated.push(response);
        }
        await this.dbService.saveRegisteredReadingsCache(updated);
      }

      this.goBackToSearch();
      await this.loadPendingReadings();
      await this.loadCachedMeters();
    } catch (e) {
      console.error('Error al registrar lectura:', e);
    } finally {
      this.isSaving.set(false);
    }
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
    await this.loadPendingReadings();
    if (this.networkService.isOnline()) {
      await this.fetchAndCacheMeters();
    }
  }
}
