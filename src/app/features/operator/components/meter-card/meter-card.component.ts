import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';

export interface MeterStatusInfo {
  label: string;
  icon: string;
  cssClass: string | null;
}

@Component({
  selector: 'app-meter-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meter-card.component.html',
  styleUrl: './meter-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterCardComponent {
  @Input({ required: true }) meter!: IMeterDto;
  @Input() status: MeterStatusInfo | null = null;
  @Input() showArrow = true;
  @Input() isSelected = false;

  @Output() meterSelect = new EventEmitter<IMeterDto>();

  onSelect(): void {
    this.meterSelect.emit(this.meter);
  }
}
