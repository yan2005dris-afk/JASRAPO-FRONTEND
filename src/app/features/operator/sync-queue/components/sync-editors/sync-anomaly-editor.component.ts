import { Component, OnDestroy, OnInit, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PendingRecord } from '../../../../../core/services/indexed-db.service';

export interface AnomalyEditResult {
  recordId: number;
  tipo: string;
  observacion: string;
  fotoBlob?: Blob | null;
}

@Component({
  selector: 'app-sync-anomaly-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-panel" role="region" aria-label="Editar novedad rechazada">
      <div class="edit-panel-title">
        <i class="bi bi-pencil-fill" aria-hidden="true"></i>
        <span>Corregir Novedad</span>
      </div>

      <div class="edit-row">
        <label [attr.for]="'edit-tipo-' + record().id" class="edit-label">Tipo de Novedad</label>
        <select
          [attr.id]="'edit-tipo-' + record().id"
          class="edit-input edit-select"
          [(ngModel)]="tipo"
        >
          <option value="FUGA">Fuga de Agua</option>
          <option value="MEDIDOR_DAÑADO">Medidor Dañado / Roto</option>
          <option value="LECTURA_ERRONEA">Lectura Errónea</option>
          <option value="OTRO">Otro Problema</option>
        </select>
      </div>

      <div class="edit-row">
        <label [attr.for]="'edit-obs-' + record().id" class="edit-label">Observación</label>
        <textarea
          [attr.id]="'edit-obs-' + record().id"
          class="edit-input edit-textarea"
          [(ngModel)]="observacion"
          rows="3"
          placeholder="Describe la corrección o motivo..."
        ></textarea>
      </div>

      <!-- Gestión de Evidencia Fotográfica -->
      <div class="edit-row photo-section">
        <label [attr.for]="'photo-upload-' + record().id" class="edit-label"
          >Evidencia Fotográfica</label
        >
        @if (fotoPreview()) {
          <div class="photo-preview-container">
            <img [src]="fotoPreview()" alt="Vista previa de evidencia" class="photo-img" />
            <button
              type="button"
              class="btn-remove-photo"
              (click)="removePhoto()"
              aria-label="Eliminar foto"
              title="Eliminar foto"
            >
              <i class="bi bi-trash3-fill" aria-hidden="true"></i>
            </button>
          </div>
        } @else {
          <label [attr.for]="'photo-upload-' + record().id" class="btn-upload-photo">
            <i class="bi bi-camera-fill" aria-hidden="true"></i>
            <span>Adjuntar / Reemplazar Foto</span>
            <input
              [attr.id]="'photo-upload-' + record().id"
              type="file"
              accept="image/*"
              class="file-input-hidden"
              (change)="onPhotoSelected($event)"
            />
          </label>
        }
      </div>

      <div class="edit-actions">
        <button
          type="button"
          class="btn-save"
          (click)="save()"
          [disabled]="!observacion.trim() || isSaving()"
        >
          <i class="bi bi-check-lg" aria-hidden="true"></i>
          <span>{{ isSaving() ? 'Guardando...' : 'Guardar' }}</span>
        </button>
        <button type="button" class="btn-cancel" (click)="canceled.emit()" [disabled]="isSaving()">
          Cancelar
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .edit-panel {
        background: var(--bg-surface-secondary, #f1f5f9);
        border: 1px solid var(--border-color, #cbd5e1);
        border-radius: 10px;
        padding: 0.875rem;
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }
      .edit-panel-title {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--primary-color, #0c9ea1);
      }
      .edit-row {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .edit-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dark-text, #334155);
      }
      .edit-input {
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--border-color, #cbd5e1);
        border-radius: 6px;
        font-size: 0.875rem;
        background: #fff;
      }
      .edit-textarea {
        resize: vertical;
      }
      .photo-section {
        margin-top: 0.25rem;
      }
      .photo-preview-container {
        position: relative;
        display: inline-block;
        width: 100px;
        height: 100px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color, #cbd5e1);
      }
      .photo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .btn-remove-photo {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(220, 38, 38, 0.9);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.75rem;
      }
      .btn-upload-photo {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.75rem;
        border: 1px dashed var(--primary-color, #0c9ea1);
        border-radius: 6px;
        color: var(--primary-color, #0c9ea1);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        background: rgba(12, 158, 161, 0.05);
        width: fit-content;
      }
      .file-input-hidden {
        display: none;
      }
      .edit-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
      .btn-save {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--primary-color, #0c9ea1);
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-cancel {
        background: transparent;
        border: 1px solid var(--border-color, #cbd5e1);
        border-radius: 6px;
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
        color: var(--muted-text, #64748b);
        cursor: pointer;
      }
    `,
  ],
})
export class SyncAnomalyEditorComponent implements OnInit, OnDestroy {
  readonly record = input.required<PendingRecord>();
  readonly saved = output<AnomalyEditResult>();
  readonly canceled = output<void>();

  tipo = 'FUGA';
  observacion = '';
  readonly fotoPreview = signal<string | null>(null);
  readonly isSaving = signal(false);
  private fotoBlob: Blob | null = null;
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    const rec = this.record();
    this.tipo = String(rec['tipo'] ?? 'FUGA');
    this.observacion = String(rec['observacion'] ?? '');
    this.fotoBlob = rec['fotoBlob'] instanceof Blob ? rec['fotoBlob'] : null;

    if (this.fotoBlob) {
      this.setBlobPreview(this.fotoBlob);
    }
  }

  private setBlobPreview(blob: Blob): void {
    this.revokePreviewUrl();
    this.previewObjectUrl = URL.createObjectURL(blob);
    this.fotoPreview.set(this.previewObjectUrl);
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fotoBlob = file;
    this.setBlobPreview(file);
  }

  removePhoto(): void {
    this.fotoBlob = null;
    this.revokePreviewUrl();
    this.fotoPreview.set(null);
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  save(): void {
    const rec = this.record();
    if (!this.observacion.trim() || rec.id == null) return;

    this.isSaving.set(true);
    this.saved.emit({
      recordId: rec.id,
      tipo: this.tipo,
      observacion: this.observacion.trim(),
      fotoBlob: this.fotoBlob,
    });
  }
}
