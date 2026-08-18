import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { IOverdueAccountsFilters } from '../interfaces/ireport.interface';
import { ReportsService } from '../services/reports.service';
import { ClientsService } from '../../contracts/clients/services/clients.service';
import type { IClient } from '../../contracts/clients/interfaces/iclients.interface';

interface MorosoItem {
  contratoId: string;
  numeroGuia: string;
  clienteNombre: string;
  identificacion: string;
  sectorNombre: string;
  mesesVencidos: number;
  saldoPendiente: string;
  saldoPendienteNum: number;
  ultimaEmision: string;
  medidorSerie: string;
}

interface OverdueAccountsData {
  data?: MorosoItem[];
  meta?: {
    total?: number;
    fechaCorte?: string;
  };
  kpis?: {
    totalMorosidad?: string;
    totalMorosos?: number;
    mayorDeuda?: string;
  };
  // Fallbacks para compatibilidad
  morosos?: MorosoItem[];
  totalMorosos?: number;
  totalMorosidad?: string;
  mayorDeuda?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-overdue-accounts',
  imports: [CommonModule, FormsModule, DatePickerComponent, PaginationComponent],
  templateUrl: './overdue-accounts.html',
  styleUrl: './overdue-accounts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverdueAccountsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly clientsService = inject(ClientsService);
  private readonly toast = inject(ToastService);

  // Filtros
  readonly fechaCorte = signal('');
  readonly clienteId = signal('');
  readonly selectedClientLabel = signal('');
  readonly selectedClientName = signal('');
  readonly searchTermTable = signal('');

  // Resultados
  readonly reportData = signal<OverdueAccountsData | null>(null);
  readonly isLoading = signal(false);

  // Paginación
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 25];

  // Buscador modal de clientes
  readonly searchClientTerm = signal('');
  readonly searchClientResults = signal<IClient[]>([]);
  readonly isSearchingClient = signal(false);
  readonly searchClientError = signal('');
  readonly searchClientPerformed = signal(false);
  readonly isClientPickerOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Por defecto consulta con fecha corte de hoy
    this.consultar();
  }

  readonly filteredMorosos = computed(() => {
    const data = this.reportData();
    const list = data?.data ?? data?.morosos ?? [];
    const term = this.searchTermTable().trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (m) =>
        m.clienteNombre.toLowerCase().includes(term) ||
        m.identificacion.toLowerCase().includes(term) ||
        m.numeroGuia.toLowerCase().includes(term) ||
        m.sectorNombre.toLowerCase().includes(term) ||
        m.medidorSerie.toLowerCase().includes(term),
    );
  });

  readonly pagedMorosos = computed(() => {
    const list = this.filteredMorosos();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly totalMorosidad = computed(() => {
    const d = this.reportData();
    return d?.kpis?.totalMorosidad ?? d?.totalMorosidad ?? '0.00';
  });

  readonly totalMorososCount = computed(() => {
    const d = this.reportData();
    return d?.kpis?.totalMorosos ?? d?.meta?.total ?? d?.totalMorosos ?? 0;
  });

  readonly mayorDeuda = computed(() => {
    const d = this.reportData();
    return d?.kpis?.mayorDeuda ?? d?.mayorDeuda ?? '0.00';
  });

  // ---------- Buscador modal de clientes ----------

  onClientSearchInput(value: string): void {
    this.searchClientTerm.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.buscarClientes(), 400);
  }

  abrirBuscadorClientes(): void {
    this.isClientPickerOpen.set(true);
    if (!this.searchClientPerformed()) {
      this.buscarClientes();
    }
  }

  cerrarBuscadorClientes(): void {
    this.isClientPickerOpen.set(false);
  }

  buscarClientes(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    const term = this.searchClientTerm().trim();
    if (!term) {
      this.searchClientResults.set([]);
      this.searchClientError.set('');
      this.searchClientPerformed.set(false);
      return;
    }

    this.isSearchingClient.set(true);
    this.searchClientError.set('');
    this.clientsService.searchClients({ nombreCompleto: term, page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.searchClientResults.set(res.data);
        this.searchClientPerformed.set(true);
        this.isSearchingClient.set(false);
      },
      error: (err) => {
        this.searchClientResults.set([]);
        this.searchClientPerformed.set(true);
        this.searchClientError.set(this.getErrorMessage(err, 'No se pudieron buscar los clientes'));
        this.isSearchingClient.set(false);
      },
    });
  }

  seleccionarCliente(cliente: IClient): void {
    this.clienteId.set(String(cliente.clienteId ?? cliente.id ?? cliente.clientId ?? ''));
    const nombre = this.formatClientName(cliente);
    this.selectedClientLabel.set(`${nombre} · ${cliente.identificacion}`);
    this.selectedClientName.set(nombre);
    this.isClientPickerOpen.set(false);
  }

  formatClientName(cliente: IClient): string {
    if (cliente.razonSocial) {
      return cliente.razonSocial;
    }
    return `${cliente.nombres ?? ''} ${cliente.apellidos ?? ''}`.trim();
  }

  // ---------- Consultar ----------

  consultar(): void {
    this.isLoading.set(true);
    const filters: IOverdueAccountsFilters = {};

    if (this.clienteId().trim()) filters.clienteId = this.clienteId().trim();
    if (this.fechaCorte()) filters.fechaCorte = this.fechaCorte();

    this.reportsService.getOverdueAccounts(filters).subscribe({
      next: (data) => {
        this.reportData.set(data as unknown as OverdueAccountsData);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(
          this.getErrorMessage(err, 'No se pudo cargar el reporte de recaudación y morosidad'),
          'Error',
        );
      },
    });
  }

  limpiar(): void {
    this.fechaCorte.set('');
    this.clienteId.set('');
    this.selectedClientLabel.set('');
    this.selectedClientName.set('');
    this.searchTermTable.set('');
    this.consultar();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const inner = (err as { error?: unknown }).error;
      if (inner && typeof inner === 'object' && 'message' in inner) {
        const message = (inner as { message?: unknown }).message;
        if (typeof message === 'string' && message) {
          return message;
        }
      }
    }
    return fallback;
  }
}
