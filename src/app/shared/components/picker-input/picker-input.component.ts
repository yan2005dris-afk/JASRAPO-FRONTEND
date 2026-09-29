import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-picker-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './picker-input.component.html',
  styleUrl: './picker-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerInputComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);

  readonly inputId = input<string>('');
  readonly label = input<string>('');
  readonly placeholder = input<string>('Buscar...');
  readonly icon = input<string>('bi-search');
  readonly query = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly isOpen = input<boolean>(false);
  readonly hasValue = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados.');

  readonly queryChange = output<string>();
  readonly openChange = output<boolean>();
  readonly clear = output<void>();

  /** Reference to the native <input> element for focus management. */
  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  /**
   * Track whether the native input had focus before a DOM swap (e.g. spinner
   * replacing the clear button inside the input-group suffix).
   */
  private hadFocus = false;
  private focusObserver: MutationObserver | null = null;

  ngAfterViewInit(): void {
    // Watch for attribute changes on the input (disabled toggling, etc.)
    // and restore focus when the input is still in the DOM.
    const inputEl = this.inputElement()?.nativeElement;
    if (inputEl) {
      this.focusObserver = new MutationObserver(() => {
        if (this.hadFocus && document.activeElement !== inputEl && !inputEl.disabled) {
          inputEl.focus();
        }
      });
      this.focusObserver.observe(inputEl, { attributes: true, attributeFilter: ['disabled'] });
    }
  }

  ngOnDestroy(): void {
    this.focusObserver?.disconnect();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.isOpen() && target && !this.elementRef.nativeElement.contains(target)) {
      this.openChange.emit(false);
    }
  }

  onInputClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.disabled()) {
      this.openChange.emit(!this.isOpen());
    }
  }

  onInputChange(val: string): void {
    this.queryChange.emit(val);
    if (!this.isOpen()) {
      this.openChange.emit(true);
    }
  }

  onInputFocus(): void {
    this.hadFocus = true;
  }

  onInputBlur(): void {
    // Delay clearing hadFocus so the MutationObserver can act first.
    setTimeout(() => {
      this.hadFocus = false;
    }, 100);
  }

  onClearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.clear.emit();
  }

  /** Programmatically restore focus to the search input. */
  focus(): void {
    this.inputElement()?.nativeElement.focus();
  }
}
