import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-alert.component.html',
  styleUrl: './offline-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineAlertComponent {
  readonly message = input('Sin conexión de internet');
}
