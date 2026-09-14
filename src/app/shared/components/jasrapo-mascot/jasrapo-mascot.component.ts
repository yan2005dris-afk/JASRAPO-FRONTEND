import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type JasrapoMascotSize = 'sm' | 'md' | 'lg' | 'hero';

@Component({
  selector: 'app-jasrapo-mascot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jasrapo-mascot.component.html',
  styleUrl: './jasrapo-mascot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JasrapoMascotComponent {
  /** Tamaño del vector SVG */
  readonly size = input<JasrapoMascotSize>('lg');

  /** Expresión / estado: 'happy' | 'confident' | 'waving' */
  readonly expression = input<'happy' | 'confident' | 'waving'>('happy');

  /** Si la mascota es interactiva al clic / hover */
  readonly interactive = input<boolean>(true);

  /** Si debe incluir el fondo radial oscuro propio del SVG */
  readonly withBackground = input<boolean>(false);

  /** Emite al hacer clic sobre la mascota */
  readonly mascotClick = output<void>();

  /** Animación de rebote al interactuar */
  readonly isBouncing = signal<boolean>(false);

  handleClick(): void {
    if (!this.interactive()) return;

    this.isBouncing.set(true);
    setTimeout(() => this.isBouncing.set(false), 600);

    this.mascotClick.emit();
  }
}
