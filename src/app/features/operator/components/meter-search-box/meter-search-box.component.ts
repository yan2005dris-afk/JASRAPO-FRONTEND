import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-meter-search-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
      }
      .search-box {
        position: relative;
      }
      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted-text);
        font-size: 1rem;
        pointer-events: none;
      }
      .search-input {
        width: 100%;
        height: 48px;
        padding: 0 2.5rem 0 2.75rem;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        font-size: 0.9rem;
        color: var(--dark-text);
        background: var(--white);
        outline: none;
        transition: border-color 0.2s ease;
      }
      .search-input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px var(--input-focus-ring, rgba(12, 158, 161, 0.12));
      }
      .search-input::placeholder {
        color: var(--muted-text);
        font-size: 0.85rem;
      }
      .search-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--bg-secondary, #f8f9fa);
      }
      .btn-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        border: none;
        background: transparent;
        color: var(--muted-text);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 4px;
      }
    `,
  ],
  template: `
    <div class="search-box">
      <i class="bi bi-search search-icon"></i>
      <input
        type="text"
        class="search-input"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        (input)="onInput($event)"
      />
      @if (value()) {
        <button
          type="button"
          class="btn-clear"
          (click)="valueChange.emit('')"
          aria-label="Limpiar búsqueda"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      }
    </div>
  `,
})
export class MeterSearchBoxComponent {
  readonly value = input('');
  readonly disabled = input(false);
  readonly placeholder = input('Buscar por serie, cliente, contrato...');
  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.valueChange.emit(target?.value ?? '');
  }
}
