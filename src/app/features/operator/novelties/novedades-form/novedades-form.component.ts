import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NetworkService } from '../../../../core/services/network.service';
import { OperatorSyncService } from '../../../../core/services/operator-sync.service';
import { MeterCacheService } from '../../../../core/services/meter-cache.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture.component';
import { MeterSearchBoxComponent } from '../../components/meter-search-box/meter-search-box.component';
import { MeterCardComponent } from '../../components/meter-card/meter-card.component';
import { SelectedMeterCardComponent } from '../../components/selected-meter-card/selected-meter-card.component';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly networkService = inject(NetworkService);
  private readonly syncService = inject(OperatorSyncService);
  private readonly meterCache = inject(MeterCacheService);
  private readonly toastService = inject(ToastService);

  readonly metersList = this.meterCache.metersList;
  readonly searchQuery = signal<string>('');
  readonly selectedMeter = signal<IMeterDto | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly photoBlob = signal<Blob | null>(null);
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
    const list = this.metersList();
    if (!query) return list;
    return list.filter(
      (m) =>
        m.serie.toLowerCase().includes(query) ||
        (m.contratoId && m.contratoId.toString().toLowerCase().includes(query)) ||
        (m.clienteNombre && m.clienteNombre.toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.noveltyForm = this.fb.group({
      tipo: ['', Validators.required],
      observacion: ['', [Validators.required, Validators.minLength(5)]],
    });

    this.meterCache.load().then(() => {
      const params = this.route.snapshot.queryParamMap;
      this.presetLecturaId = params.get('lecturaId');
      const medidorId = params.get('medidorId');
      if (medidorId) {
        const meter = this.metersList().find((m) => m.medidorId.toString() === medidorId);
        if (meter) {
          this.selectedMeter.set(meter);
          this.searchQuery.set('');
        }
      }
      const tipo = params.get('tipo');
      const observacion = params.get('observacion');
      if (tipo || observacion) {
        this.noveltyForm.patchValue({
          tipo: tipo ?? '',
          observacion: observacion ?? '',
        });
      }
    });
  }

  selectMeter(meter: IMeterDto): void {
    this.selectedMeter.set(meter);
    this.searchQuery.set('');
    this.noveltyForm.reset({ tipo: '', observacion: '' });
    this.photoBlob.set(null);
  }

  clearSelection(): void {
    this.selectedMeter.set(null);
    this.photoBlob.set(null);
    this.noveltyForm.reset();
  }

  goBack(): void {
    this.router.navigate(['/app/operador/novedades']);
  }

  private async getLatestReadingId(contratoId: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<{ data?: { lecturaId: string }[] }>(
        `${environment.apiUrl}/readings?contratoId=${contratoId}`,
        { withCredentials: true },
      ),
    );
    if (response?.data?.length) return response.data[0].lecturaId;
    throw new Error('No se encontró ninguna lectura asociada al contrato del medidor.');
  }

  onPhotoChange(photo: Blob | null): void {
    this.photoBlob.set(photo);
  }

  async onSubmit(): Promise<void> {
    if (this.noveltyForm.invalid || !this.selectedMeter()) {
      this.noveltyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const { tipo, observacion } = this.noveltyForm.value;
    const meter = this.selectedMeter()!;

    let lecturaId: string | number = this.presetLecturaId ?? `TEMP_METER_${meter.medidorId}`;

    if (!this.presetLecturaId && this.networkService.isOnline() && meter.contratoId) {
      try {
        lecturaId = await this.getLatestReadingId(meter.contratoId.toString());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al obtener la lectura.';
        this.toastService.error(msg, 'Error');
        this.isSaving.set(false);
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      lecturaId,
      observacion,
      tipo,
      estado: 'PENDIENTE',
      fotoBlob: this.photoBlob(),
      medidorId: meter.medidorId.toString(),
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
