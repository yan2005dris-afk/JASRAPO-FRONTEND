import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BRAND_CONFIG } from '../../constants/brand.constant';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="brand-logo-container"
      [class]="'size-' + size()"
      [class.has-text]="showText()"
      [class.text-light]="textColor() === 'light'"
      [class.text-dark]="textColor() === 'dark'"
      [class.stacked]="stacked()"
    >
      <div class="brand-seal-wrapper" [class.seal-hero]="size() === 'hero'">
        <img
          [src]="currentLogoUrl()"
          [alt]="brand.fullName"
          class="brand-logo-img"
          (error)="onImageError()"
        />
      </div>

      @if (showText()) {
        <div class="brand-text-block">
          <span class="brand-title">{{ brand.name }}</span>
          @if (showSubtitle()) {
            <span class="brand-subtitle">{{ subtitleText() || brand.service }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .brand-logo-container {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        transition: all 0.25s ease;

        &.stacked {
          flex-direction: column;
          text-align: center;
          gap: 0.5rem;
        }

        &.text-light {
          .brand-title {
            color: #ffffff;
          }
          .brand-subtitle {
            color: rgba(255, 255, 255, 0.75);
          }
        }

        &.text-dark {
          .brand-title {
            color: var(--marine-slate, #0b2938);
          }
          .brand-subtitle {
            color: var(--muted-text, #597b7d);
          }
        }
      }

      .brand-seal-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffff;
        border-radius: 50%;
        box-shadow:
          0 2px 8px rgba(12, 158, 161, 0.16),
          0 0 0 1px rgba(12, 158, 161, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        flex-shrink: 0;

        &.seal-hero {
          box-shadow:
            0 12px 30px -4px rgba(12, 158, 161, 0.22),
            0 0 0 2px rgba(217, 119, 6, 0.3),
            0 0 0 6px rgba(12, 158, 161, 0.12);
          background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
        }
      }

      .brand-logo-img {
        object-fit: contain;
        border-radius: 50%;
        display: block;
      }

      /* Sizes */
      .size-xs {
        .brand-seal-wrapper {
          width: 28px;
          height: 28px;
          padding: 2px;
        }
        .brand-logo-img {
          width: 24px;
          height: 24px;
        }
        .brand-title {
          font-size: 0.9rem;
          font-weight: 700;
        }
      }

      .size-sm {
        .brand-seal-wrapper {
          width: 38px;
          height: 38px;
          padding: 2.5px;
        }
        .brand-logo-img {
          width: 33px;
          height: 33px;
        }
        .brand-title {
          font-size: 1.05rem;
          font-weight: 800;
          letter-spacing: -0.4px;
          line-height: 1.1;
        }
        .brand-subtitle {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1px;
          line-height: 1.1;
        }
      }

      .size-md {
        .brand-seal-wrapper {
          width: 48px;
          height: 48px;
          padding: 3px;
        }
        .brand-logo-img {
          width: 42px;
          height: 42px;
        }
        .brand-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 0.8rem;
          font-weight: 500;
        }
      }

      .size-lg {
        .brand-seal-wrapper {
          width: 68px;
          height: 68px;
          padding: 4px;
        }
        .brand-logo-img {
          width: 60px;
          height: 60px;
        }
        .brand-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 0.875rem;
        }
      }

      .size-hero {
        .brand-seal-wrapper {
          width: 120px;
          height: 120px;
          padding: 6px;
        }
        .brand-logo-img {
          width: 108px;
          height: 108px;
        }
        .brand-title {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -1px;
        }
        .brand-subtitle {
          font-size: 1.1rem;
        }
      }

      .brand-text-block {
        display: flex;
        flex-direction: column;
        justify-content: center;
        line-height: 1.15;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogoComponent {
  readonly brand = BRAND_CONFIG;

  readonly size = input<BrandLogoSize>('md');
  readonly showText = input<boolean>(false);
  readonly showSubtitle = input<boolean>(false);
  readonly subtitleText = input<string>('');
  readonly textColor = input<'dark' | 'light' | 'inherit'>('inherit');
  readonly stacked = input<boolean>(false);

  readonly currentLogoUrl = signal<string>(BRAND_CONFIG.logoUrl);

  onImageError(): void {
    if (this.currentLogoUrl() !== BRAND_CONFIG.fallbackLogoUrl) {
      this.currentLogoUrl.set(BRAND_CONFIG.fallbackLogoUrl);
    }
  }
}
