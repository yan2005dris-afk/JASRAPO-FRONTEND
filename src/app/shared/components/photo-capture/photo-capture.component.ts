import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
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
      @if (previewUrl) {
        <div class="photo-preview-box">
          <img [src]="previewUrl" alt="Foto del medidor" class="photo-img" />
          <button
            type="button"
            class="btn-remove-photo"
            (click)="removePhoto()"
            title="Eliminar foto"
          >
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class PhotoCaptureComponent implements OnChanges, OnDestroy {
  @Input() preview: Blob | null = null;
  @Output() previewChange = new EventEmitter<Blob | null>();
  previewUrl: string | null = null;
  private ownsPreviewUrl = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['preview']) return;
    const blob = changes['preview'].currentValue as Blob | null;
    if (blob instanceof Blob) {
      this.setPreview(blob);
    } else {
      this.revokePreview();
    }
  }

  onCapture(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.setPreview(file);
    this.previewChange.emit(file);
  }
  removePhoto(): void {
    this.revokePreview();
    this.previewChange.emit(null);
  }
  ngOnDestroy(): void {
    this.revokePreview();
  }
  private setPreview(blob: Blob): void {
    this.revokePreview();
    this.previewUrl = URL.createObjectURL(blob);
    this.ownsPreviewUrl = true;
  }

  private revokePreview(): void {
    if (this.previewUrl && this.ownsPreviewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.ownsPreviewUrl = false;
  }
}
