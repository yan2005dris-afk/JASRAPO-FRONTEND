import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OperatorService } from '../service/operator.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';
import { firstValueFrom } from 'rxjs';

interface EstadoInfo {
  codigo: string;
  nombre: string;
  orden: number;
  icono: string;
}

interface EstadoChip {
  value: string;
  label: string;
  icon: string;
}

interface MeterGroup {
  estado: string;
  info: { label: string; icon: string; cssClass: string | null };
  meters: IMeterDto[];
}

type MobileStep = 'search' | 'actions' | 'form';

@Component({
  selector: 'app-operator-readings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lecturas.component.html',
  styleUrl: './lecturas.component.scss',
})
export class LecturasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  private readonly toastService = inject(ToastService);
  private readonly operatorService = inject(OperatorService);
  // Mobile step flow
  readonly currentStep = signal<MobileStep>('search');

  // Catálogo de medidores cargado (memoria local)
  readonly metersList = signal<IMeterDto[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Lecturas registradas en el período activo (memoria local/caché)
  readonly registeredReadings = signal<any[]>([]);
  readonly pendingReadings = signal<any[]>([]);

  // Conjunto de IDs de medidores que ya tienen lectura (sincronizada o pendiente)
  readonly readMetersIds = computed(() => {
    const registered = this.registeredReadings();
    const pending = this.pendingReadings();
    const ids = new Set<string>();
    for (const r of registered) {
      if (r.medidorId) ids.add(r.medidorId.toString());
    }
    for (const p of pending) {
      if (p.medidorId) ids.add(p.medidorId.toString());
    }
    return ids;
  });

  // ========== ESTADO FILTERS & GROUPING ==========

  // Catálogo de estados cargado desde el backend (fallback hardcoded offline)
  readonly estadosCatalog = signal<EstadoInfo[]>([]);

  // Chips de filtro por estado
  readonly estadoFilterChips = computed<EstadoChip[]>(() => {
    const chips: EstadoChip[] = [
      { value: 'todas', label: 'Todas', icon: 'bi-funnel' },
    ];
    for (const e of this.estadosCatalog()) {
      chips.push({ value: e.codigo, label: e.nombre, icon: e.icono });
    }
    return chips;
  });

  // Filtro de estado activo
  readonly selectedEstadoFilter = signal<string>('todas');

  // Mapa medidorId → lectura existente (de registeredReadings + pendingReadings)
  readonly existingReadingMap = computed<Map<string, any>>(() => {
    const map = new Map<string, any>();
    for (const r of this.registeredReadings()) {
      if (r.medidorId != null) map.set(r.medidorId.toString(), r);
    }
    for (const p of this.pendingReadings()) {
      if (p.medidorId != null && !map.has(p.medidorId.toString())) {
        map.set(p.medidorId.toString(), p);
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

    // Orden consistente de grupos
    const order = [
      '__SIN_LECTURA__',
      'PENDIENTE',
      'POR_REVISION',
      'RECHAZADA_VERIFICACION',
      'APROBADA',
      'ESTIMADA',
      'PLANILLADA',
    ];

    return order
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

  // Formulario
  readingForm!: FormGroup;

  // Filtrado reactivo de medidores según el término de búsqueda
  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.metersList();
    if (!query) return list; // Show all meters when no search query
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)) ||
        (m.marca && m.marca.toLowerCase().includes(query))
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
    this.readingForm.get('lecturaActual')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.validateReadings();
      });

    this.readingForm.get('lecturaAnterior')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  /**
   * Carga los medidores y lecturas del caché IndexedDB
   */
  private async loadCachedMeters(): Promise<void> {
    try {
      const cachedMeters = await this.dbService.getMetersCache();
      this.metersList.set(cachedMeters);

      const cachedReadings = await this.dbService.getRegisteredReadingsCache();
      this.registeredReadings.set(cachedReadings);
    } catch (e) {
      console.error('Error al cargar caché offline:', e);
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
          estados.map((e: any) => ({
            codigo: e.codigo ?? e.value ?? e.estado,
            nombre: e.nombre ?? e.label,
            orden: e.orden ?? 0,
            icono: e.icono ?? e.icon ?? 'bi-question',
          })),
        );
      } else {
        throw new Error('Offline');
      }
    } catch {
      console.warn('Usando catálogo de estados hardcoded (offline o error)');
      this.estadosCatalog.set([
        { codigo: 'PENDIENTE', nombre: 'Pendiente', orden: 1, icono: 'bi-clock' },
        { codigo: 'POR_REVISION', nombre: 'Por Revisión', orden: 2, icono: 'bi-eye' },
        { codigo: 'APROBADA', nombre: 'Aprobada', orden: 3, icono: 'bi-check-circle' },
        { codigo: 'RECHAZADA_VERIFICACION', nombre: 'Rechazada', orden: 4, icono: 'bi-x-circle-fill' },
        { codigo: 'ESTIMADA', nombre: 'Estimada', orden: 5, icono: 'bi-graph-up' },
        { codigo: 'PLANILLADA', nombre: 'Planillada', orden: 6, icono: 'bi-receipt' },
      ]);
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
      this.metersList.set(meters);

      // 2. Descargar lecturas ya registradas en el periodo actual
      const readings = await this.syncService.getCurrentPeriodReadings();
      await this.dbService.saveRegisteredReadingsCache(readings);
      this.registeredReadings.set(readings);

      this.toastService.success('Catálogo y lecturas del período actual actualizados para uso offline.', 'Sincronizado');
    } catch (err) {
      console.error('Error al sincronizar datos para offline:', err);
      this.toastService.error('No se pudo actualizar el catálogo y lecturas desde el servidor.', 'Error');
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
      this.router.navigate(['/app/operador/novedades'], {
        queryParams: { medidorId: meter.medidorId },
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

  /**
   * Captura y procesa la foto seleccionada convirtiéndola a Base64
   */
  onPhotoCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async onSubmit(): Promise<void> {
    if (this.readingForm.invalid || !this.selectedMeter()) {
      this.readingForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.readingForm.value;
    const meter = this.selectedMeter()!;

    // Generar el payload del DTO compatible con CrearLecturaDto del backend
    const payload: any = {
      fecha: new Date().toISOString(),
      lecturaAnterior: Number(formValue.lecturaAnterior),
      lecturaActual: Number(formValue.lecturaActual),
      consumoCalculado: Number(formValue.lecturaActual) - Number(formValue.lecturaAnterior),
      medidorId: meter.medidorId.toString(),
      lecturaInicial: !!formValue.lecturaInicial,
      descripcionAnomalia: formValue.descripcionAnomalia || null,
      fotoBase64: this.photoPreview() || null,
    };

    try {
      await this.syncService.submitReading(payload);
      this.goBackToSearch();
      await this.loadPendingReadings();
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
