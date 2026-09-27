import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="'badge-soft-' + tone()">
      @if (dot()) {
        <span class="status-dot"></span>
      }
      <span class="badge-text">{{ label() }}</span>
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.3px;
        border-radius: 9999px;
        line-height: 1.25;
        white-space: nowrap;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: currentColor;
      }

      .badge-soft-success {
        background-color: #dcfce7;
        color: #166534;
      }

      .badge-soft-warning {
        background-color: #fef3c7;
        color: #92400e;
      }

      .badge-soft-danger {
        background-color: #fee2e2;
        color: #991b1b;
      }

      .badge-soft-info {
        background-color: #dbf7f8;
        color: #0c777a;
      }

      .badge-soft-primary {
        background-color: #e0f2fe;
        color: #0369a1;
      }

      .badge-soft-secondary {
        background-color: #f1f5f9;
        color: #475569;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input<string>('');
  readonly customLabel = input<string>('');
  readonly customTone = input<BadgeTone | ''>('');
  readonly dot = input<boolean>(true);

  readonly label = computed(() => {
    if (this.customLabel()) return this.customLabel();
    const st = this.status() || '';
    return st.replace(/_/g, ' ');
  });

  readonly tone = computed<BadgeTone>(() => {
    if (this.customTone()) return this.customTone() as BadgeTone;
    const st = (this.status() || '').toUpperCase();

    if (
      [
        'REGISTRADO',
        'ACTIVO',
        'PAGADO',
        'APPROVED',
        'APROBADO',
        'APROBADA',
        'EXITOSO',
        'RESUELTO',
        'RESUELTA',
        'COMPLETADA',
        'RESOLVED',
      ].includes(st)
    ) {
      return 'success';
    }
    if (
      [
        'PENDIENTE',
        'PENDIENTE_INSPECCION',
        'PENDIENTE_PAGO',
        'PENDIENTE_INSTALACION',
        'IN_REVIEW',
        'EN_REVISION',
        'EN_PROCESO',
        'EN_CONVENIO',
        'RECONEXION',
        'PARCIAL',
        'CON_NOVEDAD',
        'POR_REVISION',
        'OPEN',
        'IN_PROGRESS',
      ].includes(st)
    ) {
      return 'warning';
    }
    if (
      [
        'ANULADO',
        'INACTIVO',
        'EN_MORA',
        'ORDEN_CORTE',
        'SUSPENDIDO',
        'RETIRADO',
        'RECHAZADO',
        'RECHAZADA',
        'RECHAZADA_VERIFICACION',
        'REJECTED',
        'VENCIDO',
        'ERROR',
        'FALLIDO',
        'DESCARTADO',
        'DESCARTADA',
        'CANCELADA',
        'CANCELLED',
      ].includes(st)
    ) {
      return 'danger';
    }
    if (
      [
        'GENERATED',
        'GENERADO',
        'EMITIDO',
        'NUEVA',
        'NUEVO',
        'ESTIMADA',
        'PLANILLADA',
        'ASIGNADA',
        'TOMADA',
      ].includes(st)
    ) {
      return 'info';
    }
    return 'secondary';
  });
}
