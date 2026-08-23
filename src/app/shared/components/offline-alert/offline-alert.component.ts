import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
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
  @Input() message = 'Sin conexión de internet';
}
