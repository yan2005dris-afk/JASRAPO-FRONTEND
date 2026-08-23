import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';

@Component({
  selector: 'app-selected-meter-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-meter-card.component.html',
  styleUrl: './selected-meter-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedMeterCardComponent {
  @Input({ required: true }) meter!: IMeterDto;
  @Input() isRead = false;

  @Output() clear = new EventEmitter<void>();

  onClear(): void {
    this.clear.emit();
  }
}
