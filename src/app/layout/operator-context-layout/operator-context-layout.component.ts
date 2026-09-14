import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

import { Header } from '../header/header';

@Component({
  selector: 'app-operator-context-layout',
  imports: [RouterOutlet, BottomNavComponent, Header],
  templateUrl: './operator-context-layout.component.html',
  styleUrl: './operator-context-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorContextLayoutComponent {}
