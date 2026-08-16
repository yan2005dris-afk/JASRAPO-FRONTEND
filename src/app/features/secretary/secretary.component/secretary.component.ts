import { Component } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-secretario.component',
  imports: [RouterOutlet],
  templateUrl: './secretary.component.html',
  styleUrl: './secretary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretaryComponent {}
