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
import { Router } from '@angular/router';
import { ReadingRoutesService } from '../../services/reading-routes.service';
import {
  ICreateRouteAssignmentsDto,
  ITipoActividad,
  TipoRuta,
} from '../../interfaces/ireading-route.interface';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { ContractsService } from '../../../service-contracts/services/contracts.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { User } from '../../../../users/models/user.interface';
import { IContract } from '../../../service-contracts/interfaces/icontract.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { DatePickerComponent } from '../../../../../shared/components/date-picker/date-picker.component';
import { PeriodPickerComponent } from '../../../../../shared/components/period-picker/period-picker.component';
import { PickerInputComponent } from '../../../../../shared/components/picker-input/picker-input.component';
import type { IAccountingPeriod } from '../../../../../shared/services/periods.service';

@Component({
  selector: 'app-route-assignment-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerComponent,
    PeriodPickerComponent,
    PickerInputComponent,
  ],
  templateUrl: './route-assignment-workspace.component.html',
  styleUrl: './route-assignment-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteAssignmentWorkspaceComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly routesService = inject(ReadingRoutesService);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly sectoresService = inject(SectoresService);
  private readonly usersService = inject(UsersService);
  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  // Catalogs
  readonly operarios = signal<User[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);
  readonly sectores = signal<Sectores[]>([]);
  readonly contratos = signal<IContract[]>([]);
  readonly tiposActividad = signal<ITipoActividad[]>([]);

  // Selection & Form State
  readonly selectedPeriod = signal<IAccountingPeriod | null>(null);
  readonly selectedPeriodId = signal<number | null>(null);
  readonly selectedOperarioId = signal<number | null>(null);
  readonly selectedComunidadId = signal<number | null>(null);
  readonly selectedSectorIds = signal<number[]>([]);
  readonly selectedContratoIds = signal<number[]>([]);
  readonly isAllCommunitySelected = signal<boolean>(false);
  readonly tipoActividadSeleccionada = signal<TipoRuta | string | null>(null);
  readonly fechaPlanificada = signal<string>(
    new Date().toISOString().slice(0, 7), // 'YYYY-MM'
  );
  readonly customNombreBase = signal<string | null>(null);
  readonly workerSearch = signal<string>('');
  readonly contractSearch = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingContracts = signal<boolean>(false);

  // Nombres de meses para armado descriptivo del nombre sugerido
  private readonly MONTH_NAMES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  isLecturaActivity(tipo: TipoRuta | string | null): boolean {
    return tipo === 'LECTURA' || tipo === 'TOMA_LECTURA';
  }

  getActivityIcon(codigo: string): string {
    switch (codigo) {
      case 'LECTURA':
      case 'TOMA_LECTURA':
        return 'bi-speedometer2';
      case 'CORTE':
        return 'bi-slash-circle';
      case 'RECONEXION':
        return 'bi-arrow-repeat';
      case 'INSPECCION':
        return 'bi-search';
      case 'INSTALACION':
        return 'bi-tools';
      default:
        return 'bi-clipboard-check';
    }
  }

  private getTipoActividadPrefix(tipo: TipoRuta | string | null): string {
    if (!tipo) return 'Ruta de Trabajo';
    const found = this.tiposActividad().find((t) => t.codigo === tipo);
    if (found) return `Ruta ${found.nombre}`;
    switch (tipo) {
      case 'LECTURA':
      case 'TOMA_LECTURA':
        return 'Ruta Lectura';
      case 'CORTE':
        return 'Ruta Corte';
      case 'RECONEXION':
        return 'Ruta Reconexión';
      case 'INSPECCION':
        return 'Ruta Inspección';
      case 'INSTALACION':
        return 'Ruta Instalación';
      default:
        return `Ruta ${tipo}`;
    }
  }

  readonly sugeridoNombreBase = computed(() => {
    const periodoSeleccionado = this.selectedPeriod();
    const fechaObjetivo = this.fechaPlanificada();
    const tipoActividad = this.tipoActividadSeleccionada();
    const fragmentosNombre: string[] = [this.getTipoActividadPrefix(tipoActividad)];

    if (periodoSeleccionado?.nombre) {
      fragmentosNombre.push(periodoSeleccionado.nombre);
    }

    if (fechaObjetivo && /^\d{4}-\d{2}/.test(fechaObjetivo)) {
      const [, mesString] = fechaObjetivo.split('-');
      const indiceMes = parseInt(mesString, 10) - 1;
      if (indiceMes >= 0 && indiceMes < this.MONTH_NAMES.length) {
        fragmentosNombre.push(this.MONTH_NAMES[indiceMes]);
      }
    }

    return fragmentosNombre.join(' - ');
  });

  readonly nombreBase = computed(() => {
    const valorPersonalizado = this.customNombreBase();
    return valorPersonalizado !== null ? valorPersonalizado : this.sugeridoNombreBase();
  });

  onTipoActividadChange(nuevoTipo: TipoRuta | string | null): void {
    this.tipoActividadSeleccionada.set(nuevoTipo);
  }

  onNombreBaseInput(valorIngresado: string): void {
    this.customNombreBase.set(valorIngresado);
  }

  onNombreBaseClear(): void {
    this.customNombreBase.set(null);
  }

  onFechaPlanificadaChange(nuevaFecha: string): void {
    this.fechaPlanificada.set(nuevaFecha);
  }

  // Filtered Workers
  readonly filteredOperarios = computed(() => {
    const q = this.workerSearch().toLowerCase().trim();
    const ops = this.operarios();
    if (!q) return ops;
    return ops.filter(
      (op) =>
        `${op.nombres} ${op.apellidos}`.toLowerCase().includes(q) ||
        (op.email && op.email.toLowerCase().includes(q)) ||
        (op.telefono && op.telefono.toLowerCase().includes(q)),
    );
  });

  // Filtered Sectors for selected Comunidad
  readonly filteredSectores = computed(() => {
    const comId = this.selectedComunidadId();
    if (!comId) return [];
    return this.sectores().filter((s) => s.comunidadId === comId);
  });

  getMedidorSerie(contrato: IContract): string | null {
    const medidorActivo = contrato.historialMedidores?.find(
      (historial) => historial.fechaHasta === null,
    );
    return medidorActivo?.medidor?.serie || null;
  }

  // Filtered Contracts for selected Comunidad
  readonly filteredContratos = computed(() => {
    const q = this.contractSearch().toLowerCase().trim();
    const list = this.contratos();

    return list.filter((c) => {
      const serie = this.getMedidorSerie(c);
      const matchSearch =
        !q ||
        c.contratoId?.toString().includes(q) ||
        c.cliente?.nombres?.toLowerCase().includes(q) ||
        c.cliente?.apellidos?.toLowerCase().includes(q) ||
        c.cliente?.identificacion?.toLowerCase().includes(q) ||
        c.numeroGuia?.toLowerCase().includes(q) ||
        (serie && serie.toLowerCase().includes(q));

      return matchSearch;
    });
  });

  readonly areAllFilteredContratosSelected = computed(() => {
    const filtered = this.filteredContratos();
    const current = this.selectedContratoIds();
    return filtered.length > 0 && filtered.every((c) => current.includes(Number(c.contratoId)));
  });

  // Validity
  readonly isFormValid = computed(() => {
    const tipo = this.tipoActividadSeleccionada();
    const period = this.selectedPeriod();
    const opId = this.selectedOperarioId();
    const comId = this.selectedComunidadId();
    const allCom = this.isAllCommunitySelected();
    const sectors = this.selectedSectorIds();
    const contracts = this.selectedContratoIds();

    const hasTipo = tipo !== null;
    const hasValidPeriod = period !== null && period.periodoId > 0 && period.estado === 'ABIERTO';
    const hasWorker = opId !== null && opId > 0;
    const hasComunidad = comId !== null && comId > 0;

    const hasCoverage =
      this.isLecturaActivity(tipo) ? allCom || sectors.length > 0 : contracts.length > 0;

    return hasTipo && hasValidPeriod && hasWorker && hasComunidad && hasCoverage;
  });

  ngOnInit(): void {
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    this.routesService.getActivityTypes().subscribe({
      next: (res) => this.tiposActividad.set(res),
    });

    this.comunidadesService.getAllComunidades(1, 100).subscribe({
      next: (res) => this.comunidades.set(res.data),
    });

    this.sectoresService.getAllSectores(1, 200).subscribe({
      next: (res) => this.sectores.set(res.data),
    });

    this.usersService.getUsers(1, 100).subscribe({
      next: (res) => {
        const filtered = res.data.filter((u) => {
          const roleName = u.rol?.nombre?.toLowerCase() || '';
          return roleName.includes('operador') || roleName.includes('operario');
        });
        this.operarios.set(filtered);
      },
    });
  }

  loadContractsForComunidad(comunidadId: number): void {
    this.isLoadingContracts.set(true);
    this.contractsService
      .getContracts({
        limit: 200,
      })
      .subscribe({
        next: (res) => {
          const filtered = res.data.filter(
            (c) =>
              c.comunidad?.comunidadId === comunidadId ||
              (c as unknown as { comunidadId?: number }).comunidadId === comunidadId,
          );
          this.contratos.set(filtered);
          this.isLoadingContracts.set(false);
        },
        error: () => {
          this.isLoadingContracts.set(false);
        },
      });
  }

  onPeriodSelected(period: IAccountingPeriod | null): void {
    this.selectedPeriod.set(period);
    this.selectedPeriodId.set(period ? period.periodoId : null);
  }

  selectOperario(operarioId: number): void {
    this.selectedOperarioId.set(operarioId);
  }

  onComunidadChange(comunidadId: number | null): void {
    this.selectedComunidadId.set(comunidadId);
    this.selectedSectorIds.set([]);
    this.selectedContratoIds.set([]);
    this.isAllCommunitySelected.set(false);
    if (comunidadId) {
      this.loadContractsForComunidad(comunidadId);
    } else {
      this.contratos.set([]);
    }
  }

  toggleAllCommunity(): void {
    const current = this.isAllCommunitySelected();
    this.isAllCommunitySelected.set(!current);
    if (!current) {
      this.selectedSectorIds.set([]);
    }
  }

  isSectorSelected(sectorId: number): boolean {
    return this.selectedSectorIds().includes(sectorId);
  }

  toggleSector(sectorId: number): void {
    if (this.isAllCommunitySelected()) {
      this.isAllCommunitySelected.set(false);
    }
    const list = [...this.selectedSectorIds()];
    const index = list.indexOf(sectorId);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(sectorId);
    }
    this.selectedSectorIds.set(list);
  }

  isContratoSelected(contratoId: number | string): boolean {
    return this.selectedContratoIds().includes(Number(contratoId));
  }

  toggleContrato(contratoId: number | string): void {
    const idNum = Number(contratoId);
    const list = [...this.selectedContratoIds()];
    const index = list.indexOf(idNum);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(idNum);
    }
    this.selectedContratoIds.set(list);
  }

  toggleAllFilteredContratos(): void {
    const filtered = this.filteredContratos();
    const current = this.selectedContratoIds();
    const allSelected =
      filtered.length > 0 &&
      filtered.every((c) => current.includes(Number(c.contratoId)));

    if (allSelected) {
      const filteredIds = new Set(filtered.map((c) => Number(c.contratoId)));
      this.selectedContratoIds.set(current.filter((id) => !filteredIds.has(id)));
    } else {
      const combined = new Set([
        ...current,
        ...filtered.map((c) => Number(c.contratoId)),
      ]);
      this.selectedContratoIds.set(Array.from(combined));
    }
  }

  getOperarioName(): string {
    const opId = this.selectedOperarioId();
    if (!opId) return 'Sin seleccionar';
    const op = this.operarios().find((u) => u.usuarioId === opId);
    return op ? `${op.nombres} ${op.apellidos}` : `Operario #${opId}`;
  }

  getComunidadName(): string {
    const comId = this.selectedComunidadId();
    if (!comId) return 'Sin seleccionar';
    const com = this.comunidades().find((c) => c.id === comId);
    return com ? com.nombre : `Comunidad #${comId}`;
  }

  getSelectedSectorsList(): Sectores[] {
    const ids = this.selectedSectorIds();
    return this.sectores().filter((s) => s.sectorId != null && ids.includes(s.sectorId));
  }

  confirmAndSave(): void {
    if (!this.isFormValid() || this.isLoading()) return;

    const tipo = this.tipoActividadSeleccionada();
    const coverageDescription = this.isLecturaActivity(tipo)
      ? this.isAllCommunitySelected()
        ? 'toda la comunidad'
        : `${this.selectedSectorIds().length} sector(es)`
      : `${this.selectedContratoIds().length} contrato(s)`;

    this.dialogService
      .confirm({
        title: 'Confirmar Asignación de Rutas',
        message: `¿Estás seguro de asignar ${coverageDescription} a ${this.getOperarioName()} para el período ${this.selectedPeriod()?.nombre}?`,
        confirmText: 'Sí, Asignar',
        cancelText: 'Revisar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.executeAssignment();
        }
      });
  }

  executeAssignment(): void {
    this.isLoading.set(true);

    // Si fechaPlanificada viene como 'YYYY-MM', normalizar a 'YYYY-MM-01' para compatibilidad con Date ISO en backend
    let fechaToSend = this.fechaPlanificada() || undefined;
    if (fechaToSend && /^\d{4}-\d{2}$/.test(fechaToSend)) {
      fechaToSend = `${fechaToSend}-01`;
    }

    const tipo = this.tipoActividadSeleccionada();
    const isLectura = this.isLecturaActivity(tipo);
    const dto: ICreateRouteAssignmentsDto = {
      periodoId: this.selectedPeriodId()!,
      operarioId: this.selectedOperarioId()!,
      comunidadId: this.selectedComunidadId()!,
      tipoRuta: tipo ?? undefined,
      sectorIds: isLectura
        ? this.isAllCommunitySelected()
          ? undefined
          : this.selectedSectorIds()
        : undefined,
      contratoIds: !isLectura ? this.selectedContratoIds() : undefined,
      fechaPlanificada: fechaToSend,
      nombreBase: this.nombreBase().trim() || undefined,
    };

    this.routesService.createAssignments(dto).subscribe({
      next: (routes) => {
        this.isLoading.set(false);
        this.toastService.show(
          `Se generaron exitosamente ${routes.length} ruta(s) de trabajo.`,
          'success',
        );
        this.router.navigate(['/app/Contratos/RutasDeLectura']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.show(
          err.error?.message || 'Error al procesar la asignación de rutas',
          'error',
        );
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/app/Contratos/RutasDeLectura']);
  }
}
