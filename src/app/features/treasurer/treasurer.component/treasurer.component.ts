import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tesorero.component',
  imports: [RouterOutlet],
  templateUrl: './treasurer.component.html',
  styleUrl: './treasurer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasurerComponent {}
