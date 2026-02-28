import { Component } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-secretario.component',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './secretario.component.html',
  styleUrl: './secretario.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecretarioComponent { }
