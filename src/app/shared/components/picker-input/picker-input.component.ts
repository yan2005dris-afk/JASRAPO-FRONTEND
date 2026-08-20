import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
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

  onClearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.clear.emit();
  }
}
