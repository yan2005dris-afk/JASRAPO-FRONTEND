import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';

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
  readonly meter = input.required<IMeterDto>();
  readonly status = input<MeterStatusInfo | null>(null);
  readonly showArrow = input(true);
  readonly isSelected = input(false);

  readonly meterSelect = output<IMeterDto>();

  onSelect(): void {
    this.meterSelect.emit(this.meter());
  }
}
