import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-presidente.component',
  imports: [RouterOutlet],
  templateUrl: './president.component.html',
  styleUrl: './president.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresidentComponent {}
