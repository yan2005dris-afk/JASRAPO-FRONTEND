import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CashSessionsService } from '../../services/cash-sessions.service';
import {
  ICashSession,
  IArqueoItem,
  ICreateCashMovementDto,
} from '../../interfaces/icash-session.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { CompanyService } from '../../../../admin/company/services/company.service';
import { IActivePuntoEmision } from '../../../../admin/company/interfaces/icompany.interface';
import { LocalDatePipe } from '../../../../../shared/pipes/local-date.pipe';

interface DenominacionDef {
  label: string;
  valor: number;
  esMoneda: boolean;
}

@Component({
  selector: 'app-cash-session-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LocalDatePipe],
  templateUrl: './cash-session-detail.component.html',
  styleUrl: './cash-session-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashSessionDetailComponent implements OnInit {
  private readonly cashService = inject(CashSessionsService);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  session: ICashSession | null = null;
  isLoading = true;
  isSaving = false;

  // Cajas disponibles
  activePuntos: IActivePuntoEmision[] = [];
  selectedPuntoId: number | null = null;

  // Apertura
  montoAperturaInput = 20;

  // Movimiento (Gasto / Ingreso Extra)
  showMovementModal = false;
  movementDto: ICreateCashMovementDto = {
    tipoMovimiento: 'EGRESO',
    monto: 0,
    motivo: '',
    comprobanteRef: '',
  };

  // Cierre & Arqueo
  showCloseModal = false;
  novedadCierre = '';
  totalTransferenciasDeclaradas = 0;

  // Billetes y Monedas
  billetes: { def: DenominacionDef; cantidad: number }[] = [
    { def: { label: '$100.00', valor: 100, esMoneda: false }, cantidad: 0 },
    { def: { label: '$50.00', valor: 50, esMoneda: false }, cantidad: 0 },
    { def: { label: '$20.00', valor: 20, esMoneda: false }, cantidad: 0 },
    { def: { label: '$10.00', valor: 10, esMoneda: false }, cantidad: 0 },
    { def: { label: '$5.00', valor: 5, esMoneda: false }, cantidad: 0 },
    { def: { label: '$1.00', valor: 1, esMoneda: false }, cantidad: 0 },
  ];

  monedas: { def: DenominacionDef; cantidad: number }[] = [
    { def: { label: '$1.00', valor: 1.0, esMoneda: true }, cantidad: 0 },
    { def: { label: '$0.50 (50ctvs)', valor: 0.5, esMoneda: true }, cantidad: 0 },
    { def: { label: '$0.25 (25ctvs)', valor: 0.25, esMoneda: true }, cantidad: 0 },
    { def: { label: '$0.10 (10ctvs)', valor: 0.1, esMoneda: true }, cantidad: 0 },
    { def: { label: '$0.05 (5ctvs)', valor: 0.05, esMoneda: true }, cantidad: 0 },
    { def: { label: '$0.01 (1ctv)', valor: 0.01, esMoneda: true }, cantidad: 0 },
  ];

  activeTab: 'summary' | 'movements' | 'payments' | 'arqueo' = 'summary';

  ngOnInit(): void {
    this.loadSession();
    this.loadActivePuntos();
  }

  loadActivePuntos(): void {
    this.companyService.getActivePuntosEmision().subscribe({
      next: (puntos) => {
        this.activePuntos = puntos;
        if (puntos.length > 0) {
          this.selectedPuntoId = puntos[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.activePuntos = [];
      },
    });
  }

  loadSession(): void {
    this.isLoading = true;
    this.cashService.getCurrentSession().subscribe({
      next: (res) => {
        this.session = res;
        this.isLoading = false;
        if (res) {
          this.totalTransferenciasDeclaradas = res.resumen.totalTransferencia;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.session = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openCaja(): void {
    if (this.montoAperturaInput < 0) {
      this.toastService.show('El monto de apertura no puede ser negativo', 'error');
      return;
    }
    this.isSaving = true;
    this.cashService.openSession({ montoApertura: this.montoAperturaInput }).subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.show('Sesión de caja abierta correctamente', 'success');
        this.loadSession();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Error al abrir la caja', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // Movimientos
  openAddMovementModal(): void {
    this.movementDto = {
      tipoMovimiento: 'EGRESO',
      monto: 0,
      motivo: '',
      comprobanteRef: '',
    };
    this.showMovementModal = true;
    this.cdr.markForCheck();
  }

  closeMovementModal(): void {
    this.showMovementModal = false;
    this.cdr.markForCheck();
  }

  saveMovement(): void {
    if (!this.session) return;
    if (this.movementDto.monto <= 0) {
      this.toastService.show('El monto debe ser mayor a 0', 'error');
      return;
    }
    if (!this.movementDto.motivo.trim()) {
      this.toastService.show('Debe ingresar el motivo o justificación', 'error');
      return;
    }

    this.isSaving = true;
    this.cashService.addMovement(this.session.cajaId, this.movementDto).subscribe({
      next: () => {
        this.isSaving = false;
        this.showMovementModal = false;
        this.toastService.show('Movimiento registrado exitosamente', 'success');
        this.loadSession();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Error al registrar el movimiento', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // Cálculos de Arqueo Físico
  get totalBilletes(): number {
    return this.billetes.reduce((acc, b) => acc + b.def.valor * (b.cantidad || 0), 0);
  }

  get totalMonedas(): number {
    return this.monedas.reduce((acc, m) => acc + m.def.valor * (m.cantidad || 0), 0);
  }

  get totalFisicoContado(): number {
    return Number((this.totalBilletes + this.totalMonedas).toFixed(2));
  }

  get efectivoEsperado(): number {
    return this.session?.resumen?.efectivoEsperado || 0;
  }

  get diferenciaCuadre(): number {
    return Number((this.totalFisicoContado - this.efectivoEsperado).toFixed(2));
  }

  get estadoCuadre(): { label: string; tone: string; icon: string } {
    const diff = this.diferenciaCuadre;
    if (Math.abs(diff) < 0.01) {
      return { label: 'CAJA CUADRADA', tone: 'success', icon: 'bi-check-circle-fill' };
    }
    if (diff < 0) {
      return {
        label: `FALTANTE (-$${Math.abs(diff).toFixed(2)})`,
        tone: 'danger',
        icon: 'bi-exclamation-triangle-fill',
      };
    }
    return {
      label: `SOBRANTE (+$${diff.toFixed(2)})`,
      tone: 'primary',
      icon: 'bi-info-circle-fill',
    };
  }

  // Cierre de Caja
  openCloseCajaModal(): void {
    this.showCloseModal = true;
    this.cdr.markForCheck();
  }

  closeCloseCajaModal(): void {
    this.showCloseModal = false;
    this.cdr.markForCheck();
  }

  confirmCloseCaja(): void {
    if (!this.session) return;

    const arqueo: IArqueoItem[] = [];
    for (const b of this.billetes) {
      if (b.cantidad > 0) {
        arqueo.push({
          denominacion: b.def.valor,
          cantidad: b.cantidad,
          esMoneda: false,
        });
      }
    }
    for (const m of this.monedas) {
      if (m.cantidad > 0) {
        arqueo.push({
          denominacion: m.def.valor,
          cantidad: m.cantidad,
          esMoneda: true,
        });
      }
    }

    this.isSaving = true;
    this.cashService
      .closeSession(this.session.cajaId, {
        arqueo,
        totalTransferenciasDeclaradas: this.totalTransferenciasDeclaradas,
        novedadCierre: this.novedadCierre || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          this.showCloseModal = false;
          const msg =
            res.estado === 'CERRADA'
              ? 'Caja cerrada exitosamente y cuadrada'
              : `Caja cerrada con novedad: ${res.novedadCierre || 'Descuadre'}`;
          this.toastService.show(msg, res.estado === 'CERRADA' ? 'success' : 'warning');
          this.loadSession();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.show(err?.error?.message || 'Error al cerrar la caja', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  imprimirReporte(): void {
    window.print();
  }
}
