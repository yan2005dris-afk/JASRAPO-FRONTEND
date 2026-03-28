import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-presidente.component',
  imports: [RouterOutlet],
  templateUrl: './presidente.component.html',
  styleUrl: './presidente.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresidenteComponent {}
