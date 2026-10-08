import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { NetworkService } from '../../../../../core/services/network.service';
import { OperatorSyncService } from '../../../../../core/services/operator-sync.service';
import { MeterCacheService } from '../../../../../core/services/meter-cache.service';
import { IndexedDbService } from '../../../../../core/services/indexed-db.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../../../contracts/meters/domain/models/meter.model';
import { PhotoCaptureComponent } from '../../../../../shared/components/photo-capture/photo-capture.component';
import { MeterSearchBoxComponent } from '../../../readings/components/meter-search-box/meter-search-box.component';
import { MeterCardComponent } from '../../../readings/components/meter-card/meter-card.component';
import { SelectedMeterCardComponent } from '../../../readings/components/selected-meter-card/selected-meter-card.component';
import { OperatorWorkOrder, OperatorRouteResponse } from '../../../rutas/domain/operator.models';
import type { OperatorNovelty } from '../../../rutas/domain/operator.models';
import { OperatorService } from '../../../rutas/data/operator.service';
import { firstValueFrom } from 'rxjs';

interface NoveltyMeter extends IMeterDto {
  numeroGuia?: string | null;
}

type AssignedNoveltyOrder = OperatorWorkOrder & { id?: string; serie?: string };

@Component({
  selector: 'app-novedades-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhotoCaptureComponent,
    MeterSearchBoxComponent,
    MeterCardComponent,
    SelectedMeterCardComponent,
  ],
  templateUrl: './novedades-form.component.html',
  styleUrl: './novedades-form.component.scss',
})
export class NovedadesFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly networkService = inject(NetworkService);
  private readonly syncService = inject(OperatorSyncService);
  private readonly meterCache = inject(MeterCacheService);
  private readonly dbService = inject(IndexedDbService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly operatorService = inject(OperatorService);

  readonly metersList = this.meterCache.metersList;
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly assignedWorkOrders = signal<AssignedNoveltyOrder[]>([]);
  readonly isLoadingMeters = signal(true);
  readonly editingNoveltyId = signal<string | null>(null);
  readonly editLoadError = signal(false);
  readonly isSaving = signal<boolean>(false);
  readonly photoBlob = signal<Blob | null>(null);
  readonly presetOrdenTrabajoId = signal<string | null>(null);
  readonly resolvedOrdenTrabajoId = signal<string | null>(null);
  private presetLecturaId: string | null = null;

  readonly tiposAnomalia = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado / Roto' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea' },
    { value: 'OTRO', label: 'Otro Problema' },
  ];

  noveltyForm!: FormGroup;

  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.availableMeters();
    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)) ||
        (m.numeroGuia && m.numeroGuia.toLowerCase().includes(query)) ||
        (m.direccionSuministro && m.direccionSuministro.toLowerCase().includes(query)),
    );
  });

  readonly availableMeters = computed<NoveltyMeter[]>(() => {
    const cached = this.metersList();
    const result: NoveltyMeter[] = [...cached];
    for (const order of this.assignedWorkOrders()) {
      const id = order.medidor?.medidorId ?? order.medidorId;
      const serie = order.medidor?.serie ?? order.serie;
      const index = result.findIndex(
        (meter) =>
          (id != null && String(meter.medidorId) === String(id)) ||
          (serie && meter.serie === serie),
      );
      if (index >= 0) {
        result[index] = {
          ...result[index],
          clienteNombre: order.contrato?.clienteNombre || result[index].clienteNombre,
          direccionSuministro: order.contrato?.direccion || result[index].direccionSuministro,
          numeroGuia: order.contrato?.numeroContrato || result[index].numeroGuia,
        };
        continue;
      }
      const orderId = String(order.ordenTrabajoId ?? order.id ?? '');
      if (!orderId) continue;
      result.push({
        medidorId: id != null && Number(id) > 0 ? Number(id) : -Number(orderId),
        serie: serie || order.contrato?.numeroContrato || `OT-${orderId}`,
        marca: order.tipoActividad,
        modelo: '',
        clienteNombre: order.contrato?.clienteNombre || 'Cliente sin nombre',
        contratoId: order.contratoId || null,
        direccionSuministro: order.contrato?.direccion || null,
        numeroGuia: order.contrato?.numeroContrato || null,
        fechaInstalacion: null,
      });
    }
    return result;
  });

  ngOnInit(): void {
    this.noveltyForm = this.fb.group({
      tipo: ['', Validators.required],
      observacion: ['', [Validators.required, Validators.minLength(5)]],
    });

    const params = this.route.snapshot.queryParamMap;
    this.editingNoveltyId.set(this.route.snapshot.paramMap?.get('id') ?? null);
    this.presetLecturaId = params.get('lecturaId');
    const otId = params.get('ordenTrabajoId');
    if (otId) {
      this.presetOrdenTrabajoId.set(otId);
      this.resolvedOrdenTrabajoId.set(otId);
    }

    void this.loadMetersAndSelection(params);
  }

  private async loadMetersAndSelection(params: ParamMap): Promise<void> {
    try {
      await this.meterCache.load();
      let existing: OperatorNovelty | null = null;
      const editingId = this.editingNoveltyId();
      if (editingId) {
        if (!this.networkService.isOnline()) {
          throw new Error('La edición de novedades requiere conexión.');
        }
        existing = await firstValueFrom(this.operatorService.getNovelty(editingId));
        this.presetLecturaId = existing.lecturaId;
        this.presetOrdenTrabajoId.set(existing.ordenTrabajoId);
        this.resolvedOrdenTrabajoId.set(existing.ordenTrabajoId);
      }
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : undefined;
      let orders = (await this.dbService
        .getAssignedWorkOrders(scope)
        .catch(() => [])) as AssignedNoveltyOrder[];
      // A route opened immediately before its snapshot is refreshed still carries its orders.
      const otId = existing?.ordenTrabajoId ?? params.get('ordenTrabajoId');
      if (otId) {
        try {
          const stored = sessionStorage.getItem('activeOperatorRoute');
          const route = stored ? (JSON.parse(stored) as OperatorRouteResponse) : null;
          const routeOrder = route?.ordenesTrabajo?.find(
            (order) => String(order.ordenTrabajoId) === otId,
          );
          const stop = route?.paradas?.find((item) => String(item.ordenTrabajoId) === otId);
          const fallbackOrder: AssignedNoveltyOrder | undefined = stop
            ? {
                ordenTrabajoId: otId,
                rutaId: route?.rutaId ?? '',
                tipoActividad: stop.tipoActividad,
                estado: stop.estado,
                ordenVisita: 0,
                contratoId: '',
                medidor: stop.serie ? { medidorId: '', serie: stop.serie } : null,
                contrato: {
                  numeroContrato: '',
                  clienteNombre: stop.clienteNombre ?? 'Cliente sin nombre',
                  direccion: stop.direccionSuministro ?? '',
                },
              }
            : undefined;
          if (!orders.some((order) => String(order.ordenTrabajoId ?? order.id) === otId)) {
            if (routeOrder) orders.push(routeOrder);
            else if (fallbackOrder) orders.push(fallbackOrder);
          }
        } catch {
          // IndexedDB still supplies the assigned orders if session storage is unavailable.
        }
      }
      if (!orders.length && !this.metersList().length && this.networkService.isOnline()) {
        await this.syncService.downloadAssignedData();
        await this.meterCache.load();
        orders = (await this.dbService
          .getAssignedWorkOrders(scope)
          .catch(() => [])) as AssignedNoveltyOrder[];
      }
      if (existing && !orders.some((order) => String(order.ordenTrabajoId ?? order.id) === otId)) {
        orders.push({
          ordenTrabajoId: existing.ordenTrabajoId,
          rutaId: '',
          tipoActividad: 'LECTURA',
          estado: 'PENDIENTE',
          ordenVisita: 0,
          contratoId: existing.contratoId,
          medidorId: existing.medidorId ?? undefined,
          medidor: existing.medidorId
            ? { medidorId: existing.medidorId, serie: existing.medidorSerie }
            : null,
          contrato: {
            numeroContrato: existing.numeroGuia,
            clienteNombre: existing.clienteNombre,
            direccion: existing.direccionSuministro,
          },
        });
      }
      this.assignedWorkOrders.set(orders);

      const medidorId = existing?.medidorId ?? params.get('medidorId');
      const serie = existing?.medidorSerie ?? params.get('serie');
      const targetOrder = otId
        ? orders.find((order) => String(order.ordenTrabajoId ?? order.id) === otId)
        : null;
      const targetSerie = serie || targetOrder?.medidor?.serie || targetOrder?.serie;
      const meter = this.availableMeters().find(
        (item) =>
          (medidorId && String(item.medidorId) === medidorId) ||
          (targetSerie && item.serie === targetSerie) ||
          (targetOrder && this.orderMatchesMeter(targetOrder, item)),
      );
      if (meter) {
        this.selectedMeter.set(meter);
        if (!targetOrder || !this.orderMatchesMeter(targetOrder, meter)) {
          this.presetOrdenTrabajoId.set(null);
          this.resolveWorkOrderForMeter(meter);
        }
      }

      const tipo = existing?.tipo ?? params.get('tipo');
      const observacion = existing?.observacion ?? params.get('observacion');
      if (tipo || observacion) {
        this.noveltyForm.patchValue({ tipo: tipo ?? '', observacion: observacion ?? '' });
      }
    } catch (error) {
      this.editLoadError.set(!!this.editingNoveltyId());
      this.toastService.error(
        error instanceof Error ? error.message : 'No se pudieron cargar los medidores asignados.',
        'Error',
      );
    } finally {
      this.isLoadingMeters.set(false);
    }
  }

  async selectMeter(meter: IMeterDto): Promise<void> {
    if (this.editingNoveltyId()) return;
    this.selectedMeter.set(meter);
    this.searchQuery.set('');
    this.presetLecturaId = null;
    this.presetOrdenTrabajoId.set(null);
    this.noveltyForm.reset({ tipo: '', observacion: '' });
    this.photoBlob.set(null);
    this.resolveWorkOrderForMeter(meter);
  }

  clearSelection(): void {
    if (this.editingNoveltyId()) return;
    this.selectedMeter.set(null);
    this.presetLecturaId = null;
    this.presetOrdenTrabajoId.set(null);
    this.resolvedOrdenTrabajoId.set(null);
    this.photoBlob.set(null);
    this.noveltyForm.reset();
  }

  goBack(): void {
    this.router.navigate(['/app/operador/novedades']);
  }

  private orderMatchesMeter(order: AssignedNoveltyOrder, meter: IMeterDto): boolean {
    const id = order.medidor?.medidorId ?? order.medidorId;
    const serie = order.medidor?.serie ?? order.serie;
    return (
      (id != null && String(id) === String(meter.medidorId)) ||
      (serie != null && serie === meter.serie) ||
      (meter.medidorId < 0 && String(order.ordenTrabajoId ?? order.id) === String(-meter.medidorId))
    );
  }

  private resolveWorkOrderForMeter(meter: IMeterDto): void {
    const match =
      this.assignedWorkOrders().find(
        (order) =>
          this.orderMatchesMeter(order, meter) &&
          (order.estado === 'PENDIENTE' || order.estado === 'EN_PROGRESO'),
      ) ?? this.assignedWorkOrders().find((order) => this.orderMatchesMeter(order, meter));
    this.resolvedOrdenTrabajoId.set(match ? String(match.ordenTrabajoId ?? match.id) : null);
  }

  onPhotoChange(photo: Blob | null): void {
    this.photoBlob.set(photo);
  }

  async onSubmit(): Promise<void> {
    if (this.editingNoveltyId() && this.editLoadError()) return;
    if (this.noveltyForm.invalid || !this.selectedMeter()) {
      this.noveltyForm.markAllAsTouched();
      return;
    }

    const ordenTrabajoId = this.resolvedOrdenTrabajoId() ?? this.presetOrdenTrabajoId();
    if (!ordenTrabajoId) {
      this.toastService.error(
        'Este medidor no tiene una orden de trabajo asignada para reportar una novedad.',
        'Sin orden de trabajo',
      );
      return;
    }

    this.isSaving.set(true);
    const { tipo, observacion } = this.noveltyForm.value;
    const meter = this.selectedMeter()!;

    const editingId = this.editingNoveltyId();
    if (editingId) {
      try {
        await this.syncService.updateAnomaly(editingId, {
          tipo,
          observacion,
          fotoBlob: this.photoBlob(),
        });
        this.toastService.success('Novedad actualizada correctamente.', 'Listo');
        await this.router.navigate(['/app/operador/novedades']);
      } catch {
        this.toastService.error('No se pudo actualizar la novedad.', 'Error');
      } finally {
        this.isSaving.set(false);
      }
      return;
    }

    const order = this.assignedWorkOrders().find(
      (item) => String(item.ordenTrabajoId ?? item.id) === ordenTrabajoId,
    );
    const lecturaId =
      order?.lecturaId && String(order.lecturaId) === this.presetLecturaId
        ? this.presetLecturaId
        : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      ...(ordenTrabajoId ? { ordenTrabajoId } : {}),
      ...(lecturaId ? { lecturaId } : {}),
      observacion,
      tipo,
      estado: 'PENDIENTE',
      fotoBlob: this.photoBlob(),
      medidorId: meter.medidorId.toString(),
      serie: meter.serie,
      contratoId: meter.contratoId ? meter.contratoId.toString() : null,
    };

    try {
      await this.syncService.submitAnomaly(payload);
      this.toastService.success('Novedad registrada correctamente.', 'Listo');
      this.router.navigate(['/app/operador/novedades']);
    } catch {
      this.toastService.error('No se pudo registrar la novedad.', 'Error');
    } finally {
      this.isSaving.set(false);
    }
  }
}
