import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';

@Component({
  selector: 'app-selected-meter-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-meter-card.component.html',
  styleUrl: './selected-meter-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedMeterCardComponent {
  readonly meter = input.required<IMeterDto>();
  readonly isRead = input(false);
  readonly allowClear = input(true);

  readonly clear = output<void>();

  onClear(): void {
    this.clear.emit();
  }
}
