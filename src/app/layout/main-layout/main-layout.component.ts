import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Header],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {}
