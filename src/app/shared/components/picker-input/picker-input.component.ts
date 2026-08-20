import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-picker-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective],
  templateUrl: './picker-input.component.html',
  styleUrl: './picker-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerInputComponent {
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

  onInputChange(val: string): void {
    this.queryChange.emit(val);
    if (!this.isOpen()) {
      this.openChange.emit(true);
    }
  }

  onFocus(): void {
    if (!this.disabled()) {
      this.openChange.emit(true);
    }
  }

  onClickOutside(): void {
    if (this.isOpen()) {
      this.openChange.emit(false);
    }
  }

  onClearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.clear.emit();
  }
}
