import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IReadingRoute, IReadingForRoute } from '../../interfaces/ireading-route.interface';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { User } from '../../../../users/models/user.interface';

@Component({
  selector: 'app-route-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './route-detail-modal.component.html',
  styleUrl: './route-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDetailModalComponent implements OnInit {
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly sectoresService = inject(SectoresService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly route = input.required<IReadingRoute>();
  readonly initialTab = input<'info' | 'readings'>('info');
  readonly closed = output<void>();
  readonly editRequested = output<IReadingRoute>();
  readonly reassignRequested = output<IReadingRoute>();

  // State
  activeTab: 'info' | 'readings' = 'info';
  readings: IReadingForRoute[] = [];
  isLoadingReadings = false;
  totalReadings = 0;
  processingReadingId: string | number | null = null;
  isBulkApproving = false;

  operarios: User[] = [];
  comunidades: Comunidad[] = [];
  sectores: Sectores[] = [];
  periodos: { periodoId: number; nombre?: string; estado: string }[] = [];

  ngOnInit(): void {
    this.activeTab = this.initialTab();
    this.loadReadings();

    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => {
        this.comunidades = res.data;
        this.cdr.markForCheck();
      },
    });

    this.sectoresService.getAllSectores(1, 100).subscribe({
      next: (res) => {
        this.sectores = res.data;
        this.cdr.markForCheck();
      },
    });

    this.routesService.getPeriods().subscribe({
      next: (res) => {
        this.periodos = res;
        this.cdr.markForCheck();
      },
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        this.operarios = res.data;
        this.cdr.markForCheck();
      },
    });
  }

  setActiveTab(tab: 'info' | 'readings'): void {
    this.activeTab = tab;
    if (tab === 'readings' && this.readings.length === 0) {
      this.loadReadings();
    }
  }

  loadReadings(): void {
    const currentRoute = this.route();
    if (!currentRoute?.comunidadId) return;

    this.isLoadingReadings = true;
    this.cdr.markForCheck();

    this.routesService
      .getEligibleReadings({
        comunidadId: currentRoute.comunidadId,
        sectorId: currentRoute.sectorId || undefined,
        periodoId: currentRoute.periodoId || undefined,
        fechaPlanificada: currentRoute.fechaPlanificada || undefined,
        tipoRuta: currentRoute.tipoRuta as any,
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (res) => {
          this.readings = res.data;
          this.totalReadings = res.meta?.totalItems ?? res.data.length;
          this.isLoadingReadings = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingReadings = false;
          this.cdr.markForCheck();
        },
      });
  }

  changeReadingStatus(
    lectura: IReadingForRoute,
    nuevoEstado: 'APROBADA' | 'RECHAZADA_VERIFICACION' | 'PENDIENTE',
  ): void {
    this.processingReadingId = lectura.lecturaId;
    this.cdr.markForCheck();

    this.routesService.updateReadingStatus(lectura.lecturaId, nuevoEstado).subscribe({
      next: () => {
        lectura.estadoLectura = nuevoEstado;
        this.processingReadingId = null;
        this.toastService.show(
          nuevoEstado === 'APROBADA'
            ? 'Lectura aprobada para facturación'
            : 'Lectura enviada a re-verificación',
          'success',
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.processingReadingId = null;
        this.toastService.show(
          err.error?.message || 'Error al actualizar el estado de la lectura',
          'error',
        );
        this.cdr.markForCheck();
      },
    });
  }

  get pendingReviewCount(): number {
    return this.readings.filter(
      (r) => r.estadoLectura === 'POR_REVISION' || r.estadoLectura === 'PENDIENTE',
    ).length;
  }

  approveAllPending(): void {
    const pendingList = this.readings.filter(
      (r) => r.estadoLectura === 'POR_REVISION' || r.estadoLectura === 'PENDIENTE',
    );
    if (pendingList.length === 0 || this.isBulkApproving) return;

    this.isBulkApproving = true;
    this.cdr.markForCheck();

    let completed = 0;
    for (const r of pendingList) {
      this.routesService.updateReadingStatus(r.lecturaId, 'APROBADA').subscribe({
        next: () => {
          r.estadoLectura = 'APROBADA';
          completed++;
          if (completed === pendingList.length) {
            this.isBulkApproving = false;
            this.toastService.show('Todas las lecturas fueron aprobadas', 'success');
            this.cdr.markForCheck();
          }
        },
        error: () => {
          completed++;
          if (completed === pendingList.length) {
            this.isBulkApproving = false;
            this.cdr.markForCheck();
          }
        },
      });
    }
  }

  getOperarioNombre(operarioId: number): string {
    const user = this.operarios.find((u) => u.usuarioId === operarioId);
    if (user) {
      return `${user.nombres} ${user.apellidos}`.trim();
    }
    return `Operario #${operarioId}`;
  }

  getComunidadNombre(comunidadId: number): string {
    const com = this.comunidades.find((c) => c.id === comunidadId);
    if (com) {
      return com.nombre;
    }
    return `Comunidad #${comunidadId}`;
  }

  getSectorNombre(sectorId?: number | null): string {
    if (!sectorId) return 'Sin sector asignado';
    const sec = this.sectores.find((s) => s.sectorId === sectorId);
    if (sec) {
      return sec.nombre;
    }
    return `Sector #${sectorId}`;
  }

  getPeriodoNombre(periodoId?: number | null): string {
    if (!periodoId) return '—';
    const p = this.periodos.find((item) => item.periodoId === periodoId);
    if (p && p.nombre) {
      return p.nombre;
    }
    return `Período #${periodoId}`;
  }

  close(): void {
    this.closed.emit();
  }
}
