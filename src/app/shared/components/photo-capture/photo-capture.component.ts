import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-capture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [
    `
      .photo-section {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .btn-photo {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 1rem;
        border: 1px solid var(--primary-color);
        border-radius: 10px;
        background: transparent;
        color: var(--primary-color);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-photo:hover {
        background: rgba(12, 158, 161, 0.06);
      }
      .btn-photo input {
        display: none;
      }
      .photo-preview-box {
        width: 100px;
        height: 100px;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        border: 1px solid var(--border-color);
      }
      .photo-preview-box .photo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .photo-preview-box .btn-remove-photo {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: rgba(239, 68, 68, 0.9);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        cursor: pointer;
      }
    `,
  ],
  template: `
    <div class="photo-section">
      <label class="btn-photo">
        <i class="bi bi-camera-fill"></i>
        <span>{{ preview ? 'Cambiar Foto' : 'Capturar Foto' }}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="d-none"
          (change)="onCapture($event)"
        />
      </label>
      @if (preview) {
        <div class="photo-preview-box">
          <img [src]="preview" alt="Foto del medidor" class="photo-img" />
          <button
            type="button"
            class="btn-remove-photo"
            (click)="previewChange.emit(null)"
            title="Eliminar foto"
          >
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class PhotoCaptureComponent {
  @Input() preview: string | null = null;
  @Output() previewChange = new EventEmitter<string | null>();

  onCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.previewChange.emit(reader.result as string);
    reader.readAsDataURL(file);
  }
}
