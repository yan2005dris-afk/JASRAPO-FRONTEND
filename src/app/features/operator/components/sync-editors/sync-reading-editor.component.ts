import { Component, OnInit, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PendingRecord } from '../../../../core/services/indexed-db.service';

export interface ReadingEditResult {
  recordId: number;
  lecturaActual: number;
  lecturaAnterior: number;
  lecturaInicial: boolean;
  consumoCalculado: number;
}

@Component({
  selector: 'app-sync-reading-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-panel" role="region" aria-label="Editar lectura rechazada">
      <div class="edit-panel-title">
        <i class="bi bi-pencil-fill" aria-hidden="true"></i>
        <span>Corregir Lectura</span>
      </div>

      <div class="edit-row">
        <label [attr.for]="'edit-anterior-' + record().id" class="edit-label"
          >Lectura Anterior</label
        >
        <input
          [attr.id]="'edit-anterior-' + record().id"
          type="number"
          class="edit-input"
          [(ngModel)]="lecturaAnterior"
          [disabled]="lecturaInicial"
          min="0"
          step="1"
          aria-describedby="reading-error-msg"
        />
      </div>

      <div class="edit-row">
        <label [attr.for]="'edit-actual-' + record().id" class="edit-label">Lectura Actual</label>
        <input
          [attr.id]="'edit-actual-' + record().id"
          type="number"
          class="edit-input"
          [(ngModel)]="lecturaActual"
          min="0"
          step="1"
          aria-describedby="reading-error-msg"
        />
      </div>

      <div class="edit-row checkbox-row">
        <label class="checkbox-label">
          <input type="checkbox" [(ngModel)]="lecturaInicial" />
          <span>Es primera lectura (reemplazo / instalación)</span>
        </label>
      </div>

      @if (validationErrorMessage()) {
        <div id="reading-error-msg" class="validation-msg" role="alert">
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
          <span>{{ validationErrorMessage() }}</span>
        </div>
      }

      <div class="edit-actions">
        <button
          type="button"
          class="btn-save"
          (click)="save()"
          [disabled]="isInvalid() || isSaving()"
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
      .edit-input:focus-visible {
        outline: 2px solid var(--primary-color, #0c9ea1);
        outline-offset: 1px;
      }
      .checkbox-row {
        flex-direction: row;
        align-items: center;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--dark-text, #334155);
        cursor: pointer;
      }
      .validation-msg {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: #dc2626;
        background: #fee2e2;
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
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
export class SyncReadingEditorComponent implements OnInit {
  readonly record = input.required<PendingRecord>();
  readonly saved = output<ReadingEditResult>();
  readonly canceled = output<void>();

  lecturaActual = 0;
  lecturaAnterior = 0;
  lecturaInicial = false;
  readonly isSaving = signal(false);

  ngOnInit(): void {
    const rec = this.record();
    this.lecturaActual = Number(rec['lecturaActual'] ?? 0);
    this.lecturaAnterior = Number(rec['lecturaAnterior'] ?? 0);
    this.lecturaInicial = Boolean(rec['lecturaInicial'] ?? false);
  }

  isInvalid(): boolean {
    return this.validationErrorMessage() !== null;
  }

  validationErrorMessage(): string | null {
    if (
      this.lecturaActual === null ||
      this.lecturaActual === undefined ||
      isNaN(Number(this.lecturaActual)) ||
      Number(this.lecturaActual) < 0
    ) {
      return 'La lectura actual debe ser un número mayor o igual a 0.';
    }

    if (!this.lecturaInicial) {
      if (
        this.lecturaAnterior === null ||
        this.lecturaAnterior === undefined ||
        isNaN(Number(this.lecturaAnterior)) ||
        Number(this.lecturaAnterior) < 0
      ) {
        return 'La lectura anterior debe ser un número mayor o igual a 0.';
      }
      if (Number(this.lecturaActual) < Number(this.lecturaAnterior)) {
        return 'La lectura actual no puede ser menor a la lectura anterior.';
      }
    }

    return null;
  }

  save(): void {
    const rec = this.record();
    if (this.isInvalid() || rec.id == null) return;

    const actual = Number(this.lecturaActual);
    const anterior = Number(this.lecturaAnterior);
    const consumo = this.lecturaInicial ? actual : actual - anterior;

    this.isSaving.set(true);
    this.saved.emit({
      recordId: rec.id,
      lecturaActual: actual,
      lecturaAnterior: anterior,
      lecturaInicial: this.lecturaInicial,
      consumoCalculado: consumo,
    });
  }
}
