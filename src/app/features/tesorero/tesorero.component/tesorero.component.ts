import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tesorero.component',
  imports: [RouterOutlet],
  templateUrl: './tesorero.component.html',
  styleUrl: './tesorero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreroComponent {}
