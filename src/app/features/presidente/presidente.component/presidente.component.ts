import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-presidente.component',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './presidente.component.html',
  styleUrl: './presidente.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresidenteComponent { }
