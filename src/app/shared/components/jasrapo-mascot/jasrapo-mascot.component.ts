import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgZone } from '@angular/core';

export type JasrapoMascotSize = 'sm' | 'md' | 'lg' | 'hero';

@Component({
  selector: 'app-jasrapo-mascot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jasrapo-mascot.component.html',
  styleUrl: './jasrapo-mascot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JasrapoMascotComponent implements OnInit {
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Referencia al SVG para setear CSS variables de pupila y rotación */
  readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgRef');
  readonly containerRef = viewChild<ElementRef<HTMLElement>>('containerRef');

  /** Tamaño del vector SVG */
  readonly size = input<JasrapoMascotSize>('lg');

  /** Expresión / estado: 'happy' | 'confident' | 'waving' */
  readonly expression = input<'happy' | 'confident' | 'waving'>('happy');

  /** Si la mascota es interactiva al clic / hover */
  readonly interactive = input<boolean>(true);

  /** Si el seguimiento del mouse con los ojos está activo */
  readonly enableTracking = input<boolean>(true);

  /** Si debe incluir el fondo radial oscuro propio del SVG */
  readonly withBackground = input<boolean>(false);

  /** Emite al hacer clic sobre la mascota */
  readonly mascotClick = output<void>();

  /** Estados reactivos de animación */
  readonly isBouncing = signal<boolean>(false);
  readonly isBlinking = signal<boolean>(false);
  readonly isWiggling = signal<boolean>(false);
  readonly isCurious = signal<boolean>(false);

  // Estado interno de interpolación de pupilas (Lerp 60fps fuera de Angular Zone)
  private currentLx = 0;
  private currentLy = 0;
  private currentRx = 0;
  private currentRy = 0;

  private targetLx = 0;
  private targetLy = 0;
  private targetRx = 0;
  private targetRy = 0;

  private rafId: number | null = null;
  private activeTimers: ReturnType<typeof setTimeout>[] = [];
  private isDestroyed = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }
      this.activeTimers.forEach((t) => clearTimeout(t));
      this.activeTimers = [];
    });

    // Ejecutamos todos los listeners y timers fuera de Angular Zone
    // para evitar disparar ciclos de Change Detection en cada frame o mousemove.
    this.ngZone.runOutsideAngular(() => {
      this.initMouseTracking();
      this.initBlinkingLoop();
      this.initSpontaneousIdleLoop();
    });
  }

  handleClick(): void {
    if (!this.interactive()) return;

    this.isBouncing.set(true);

    const timer = setTimeout(() => {
      this.isBouncing.set(false);
    }, 700);
    this.activeTimers.push(timer);

    this.mascotClick.emit();
  }

  /**
   * Seguimiento inteligente y suave del cursor con confinamiento anatómico
   * que garantiza que las pupilas permanezcan siempre dentro de las cuencas oculares.
   */
  private initMouseTracking(): void {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.interactive() || !this.enableTracking() || this.isDestroyed) return;

      const svgEl = this.svgRef()?.nativeElement;
      if (!svgEl) return;

      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Escala del SVG a coordenadas de pantalla
      const scaleX = rect.width / 800;
      const scaleY = rect.height / 800;
      const eyeLx = rect.left + 316 * scaleX;
      const eyeLy = rect.top + 485 * scaleY;
      const eyeRx = rect.left + 484 * scaleX;
      const eyeRy = rect.top + 485 * scaleY;

      // Límite anatómico seguro para que la pupila NUNCA salga de la esclerótica
      // Cuenca clip: rx=39.5, ry=49.5 | Pupila: rx=27, ry=34 => Margen máximo = 12.5px / 15.5px
      const maxDx = 9.5;
      const maxDy = 11.5;

      // Centro focal entre ambos ojos
      const faceCenterX = (eyeLx + eyeRx) / 2;
      const faceCenterY = (eyeLy + eyeRy) / 2;

      const dx = e.clientX - faceCenterX;
      const dy = e.clientY - faceCenterY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Referencia de distancia para atenuación progresiva en pantalla
      const viewportRef = Math.hypot(window.innerWidth, window.innerHeight) * 0.45 || 500;
      const factor = Math.min(1, Math.pow(dist / viewportRef, 0.85));

      const targetX = Math.cos(angle) * maxDx * factor;
      const targetY = Math.sin(angle) * maxDy * factor;

      // Ligera convergencia natural cuando el mouse está cerca de la gota (máx 1.2px)
      const nearFactor = Math.max(0, 1 - dist / 220);
      const convergence = nearFactor * 1.2;

      this.targetLx = Math.max(-maxDx, Math.min(maxDx, targetX + convergence));
      this.targetLy = Math.max(-maxDy, Math.min(maxDy, targetY));

      this.targetRx = Math.max(-maxDx, Math.min(maxDx, targetX - convergence));
      this.targetRy = Math.max(-maxDy, Math.min(maxDy, targetY));

      this.startRafLoop();
    };

    const handleMouseLeave = () => {
      if (this.isDestroyed) return;
      this.targetLx = 0;
      this.targetLy = 0;
      this.targetRx = 0;
      this.targetRy = 0;
      this.startRafLoop();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('blur', handleMouseLeave, { passive: true });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('blur', handleMouseLeave);
    });
  }

  private startRafLoop(): void {
    if (this.rafId !== null) return;

    const animate = () => {
      if (this.isDestroyed) {
        this.rafId = null;
        return;
      }

      const svgEl = this.svgRef()?.nativeElement;
      if (!svgEl) {
        this.rafId = null;
        return;
      }

      // Interpolación inercial ágil y precisa (lerp con factor 0.24)
      this.currentLx += (this.targetLx - this.currentLx) * 0.24;
      this.currentLy += (this.targetLy - this.currentLy) * 0.24;
      this.currentRx += (this.targetRx - this.currentRx) * 0.24;
      this.currentRy += (this.targetRy - this.currentRy) * 0.24;

      svgEl.style.setProperty('--pupil-lx', `${this.currentLx.toFixed(2)}px`);
      svgEl.style.setProperty('--pupil-ly', `${this.currentLy.toFixed(2)}px`);
      svgEl.style.setProperty('--pupil-rx', `${this.currentRx.toFixed(2)}px`);
      svgEl.style.setProperty('--pupil-ry', `${this.currentRy.toFixed(2)}px`);

      const diffL = Math.hypot(this.targetLx - this.currentLx, this.targetLy - this.currentLy);
      const diffR = Math.hypot(this.targetRx - this.currentRx, this.targetRy - this.currentRy);

      if (diffL > 0.08 || diffR > 0.08) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        // Asignación directa de reposo para ahorrar ciclos de CPU
        this.currentLx = this.targetLx;
        this.currentLy = this.targetLy;
        this.currentRx = this.targetRx;
        this.currentRy = this.targetRy;
        svgEl.style.setProperty('--pupil-lx', `${this.currentLx.toFixed(2)}px`);
        svgEl.style.setProperty('--pupil-ly', `${this.currentLy.toFixed(2)}px`);
        svgEl.style.setProperty('--pupil-rx', `${this.currentRx.toFixed(2)}px`);
        svgEl.style.setProperty('--pupil-ry', `${this.currentRy.toFixed(2)}px`);
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  /**
   * Ciclo de parpadeo natural (Blinking):
   * Parpadea cada 2.8 a 5.5 segundos. Ocasionalmente realiza un doble parpadeo.
   */
  private initBlinkingLoop(): void {
    const scheduleNext = () => {
      if (this.isDestroyed) return;

      const delay = 2800 + Math.random() * 2800;
      const timer = setTimeout(() => {
        if (this.isDestroyed) return;

        this.isBlinking.set(true);

        const closeTimer = setTimeout(() => {
          if (this.isDestroyed) return;
          this.isBlinking.set(false);

          // 25% de probabilidad de realizar un doble parpadeo espontáneo
          if (Math.random() < 0.25) {
            const pauseTimer = setTimeout(() => {
              if (this.isDestroyed) return;
              this.isBlinking.set(true);

              const secondClose = setTimeout(() => {
                if (this.isDestroyed) return;
                this.isBlinking.set(false);
                scheduleNext();
              }, 120);
              this.activeTimers.push(secondClose);
            }, 100);
            this.activeTimers.push(pauseTimer);
          } else {
            scheduleNext();
          }
        }, 140);
        this.activeTimers.push(closeTimer);
      }, delay);

      this.activeTimers.push(timer);
    };

    scheduleNext();
  }

  /**
   * Micro-movimientos espontáneos e interacciones idle cada 7 a 13 segundos:
   * - Inclinación curiosa de cabeza (Curious Head Tilt).
   * - Ondulación elástica de agua (Gelatina Wobble).
   */
  private initSpontaneousIdleLoop(): void {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    const scheduleNext = () => {
      if (this.isDestroyed) return;

      const delay = 7000 + Math.random() * 6000;
      const timer = setTimeout(() => {
        if (this.isDestroyed) return;

        // Si ya está rebotando o el usuario hace clic, postergamos
        if (this.isBouncing()) {
          scheduleNext();
          return;
        }

        const actionType = Math.random() < 0.5 ? 'tilt' : 'wobble';
        const svgEl = this.svgRef()?.nativeElement;

        if (actionType === 'tilt' && svgEl) {
          // Inclinación curiosa (entre -3.2° y +3.2°)
          const sign = Math.random() > 0.5 ? 1 : -1;
          const deg = sign * (2.2 + Math.random() * 1.5);

          svgEl.style.setProperty('--mascot-tilt', `${deg.toFixed(1)}deg`);
          this.isCurious.set(true);

          const resetTimer = setTimeout(() => {
            if (this.isDestroyed || !svgEl) return;
            svgEl.style.setProperty('--mascot-tilt', '0deg');
            this.isCurious.set(false);
            scheduleNext();
          }, 2000);
          this.activeTimers.push(resetTimer);
        } else {
          // Ondulación elástica de agua
          this.isWiggling.set(true);

          const resetTimer = setTimeout(() => {
            if (this.isDestroyed) return;
            this.isWiggling.set(false);
            scheduleNext();
          }, 650);
          this.activeTimers.push(resetTimer);
        }
      }, delay);

      this.activeTimers.push(timer);
    };

    scheduleNext();
  }
}
