import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-tesorero.component',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './tesorero.component.html',
  styleUrl: './tesorero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TesoreroComponent { }
