import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownItem {
  label: string;
  action: string;
  icon?: string;
  isDanger?: boolean;
  isDivider?: boolean;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
})
export class DropdownComponent {
  label = input<string>('Opciones');
  icon = input<string>('');
  buttonClass = input<string>(
    'btn btn-outline-secondary d-flex align-items-center gap-2 fw-medium bg-white text-muted',
  );
  items = input<DropdownItem[]>([]);

  actionSelected = output<string>();

  isOpen = signal(false);

  elementRef = inject(ElementRef);

  toggleDropdown() {
    this.isOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  onItemClick(event: Event, item: DropdownItem) {
    event.preventDefault();
    if (item.isDivider) return;
    this.actionSelected.emit(item.action);
    this.isOpen.set(false);
  }
}
