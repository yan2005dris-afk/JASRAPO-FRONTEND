import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MetersService } from '../../contracts/meters/services/meters.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../contracts/meters/interfaces/imeter.interface';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-operator-novelties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './novedades.component.html',
  styleUrl: './novedades.component.scss',
})
export class NovedadesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly metersService = inject(MetersService);
  private readonly dbService = inject(IndexedDbService);
  readonly networkService = inject(NetworkService);
  readonly syncService = inject(OperatorSyncService);
  private readonly toastService = inject(ToastService);

  readonly metersList = signal<IMeterDto[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly isLoadingMeters = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Tipos de anomalía definidos en el backend
  readonly tiposAnomalia = [
    { value: 'FUGA', label: 'Fuga de Agua' },
    { value: 'MEDIDOR_DAÑADO', label: 'Medidor Dañado / Roto' },
    { value: 'LECTURA_ERRONEA', label: 'Lectura Errónea' },
    { value: 'OTRO', label: 'Otro Problema' },
  ];

  photoPreview = signal<string | null>(null);
  noveltyForm!: FormGroup;

  // Filtrado de medidores
  readonly filteredMeters = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.metersList();
    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.initForm();
    this.loadCachedMeters().then(() => {
      // Check for pre-selected meter via query params (from Lecturas flow)
      const medidorId = this.route.snapshot.queryParamMap.get('medidorId');
      if (medidorId) {
        const meter = this.metersList().find((m) => m.medidorId.toString() === medidorId);
        if (meter) {
          this.selectMeter(meter);
        }
      }
    });
  }

  private initForm(): void {
    this.noveltyForm = this.fb.group({
      tipo: ['', Validators.required],
      observacion: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  private async loadCachedMeters(): Promise<void> {
    try {
      const cached = await this.dbService.getMetersCache();
      this.metersList.set(cached);
    } catch (e) {
      console.error('Error al cargar caché de medidores:', e);
    }
  }

  selectMeter(meter: IMeterDto): void {
    this.selectedMeter.set(meter);
    this.searchQuery.set('');
    this.noveltyForm.reset({
      tipo: '',
      observacion: '',
    });
    this.photoPreview.set(null);
  }

  clearSelection(): void {
    this.selectedMeter.set(null);
    this.photoPreview.set(null);
    this.noveltyForm.reset();
  }

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

  /**
   * Obtiene la última lectura del medidor/contrato en el backend
   */
  private async getLatestReadingId(contratoId: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/readings?contratoId=${contratoId}`, {
        withCredentials: true,
      })
    );
    if (response?.data && response.data.length > 0) {
      // Retornamos el lecturaId de la lectura más reciente
      return response.data[0].lecturaId;
    }
    throw new Error('No se encontró ninguna lectura asociada al contrato del medidor.');
  }

  async onSubmit(): Promise<void> {
    if (this.noveltyForm.invalid || !this.selectedMeter()) {
      this.noveltyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.noveltyForm.value;
    const meter = this.selectedMeter()!;

    let lecturaId: string | number = '';

    if (this.networkService.isOnline() && meter.contratoId) {
      try {
        // En online, consultamos dinámicamente la última lectura del medidor
        lecturaId = await this.getLatestReadingId(meter.contratoId.toString());
      } catch (err: any) {
        this.toastService.error(err.message || 'Error al obtener la lectura para asociar la novedad.', 'Error');
        this.isSaving.set(false);
        return;
      }
    } else {
      // En offline, guardaremos una referencia temporal (o medidorId)
      // El sync service se encargará de resolver el lecturaId al sincronizar cuando esté online.
      lecturaId = `TEMP_METER_${meter.medidorId}`;
    }

    const payload: any = {
      lecturaId: lecturaId,
      observacion: formValue.observacion,
      tipo: formValue.tipo,
      estado: 'PENDIENTE',
      fotoBase64: this.photoPreview() || null,
      // Metadatos extras para resolver offline
      medidorId: meter.medidorId.toString(),
      contratoId: meter.contratoId ? meter.contratoId.toString() : null,
    };

    try {
      await this.syncService.submitAnomaly(payload);
      this.clearSelection();
    } catch (e) {
      console.error('Error al registrar novedad:', e);
    } finally {
      this.isSaving.set(false);
    }
  }

  async forceSync(): Promise<void> {
    await this.syncService.syncPendingData();
  }
}
