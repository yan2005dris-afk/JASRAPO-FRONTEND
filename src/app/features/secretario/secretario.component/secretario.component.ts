import { Component } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-secretario.component',
  imports: [RouterOutlet],
  templateUrl: './secretario.component.html',
  styleUrl: './secretario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretarioComponent {}
