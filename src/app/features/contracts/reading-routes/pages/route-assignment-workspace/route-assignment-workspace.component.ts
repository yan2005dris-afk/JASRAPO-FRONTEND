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
  TipoRuta,
} from '../../interfaces/ireading-route.interface';
import { ComunidadesService } from '../../../../admin/comunidades/services/comunidades.service';
import { SectoresService } from '../../../../admin/sectores-prueba/services/sectores';
import { UsersService } from '../../../../users/services/users.service';
import { Comunidad } from '../../../../admin/comunidades/models/comunidad.interface';
import { Sectores } from '../../../../admin/sectores-prueba/models/sectores.interface';
import { User } from '../../../../users/models/user.interface';
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
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  // Catalogs
  readonly operarios = signal<User[]>([]);
  readonly comunidades = signal<Comunidad[]>([]);
  readonly sectores = signal<Sectores[]>([]);

  // Selection & Form State
  readonly selectedPeriod = signal<IAccountingPeriod | null>(null);
  readonly selectedPeriodId = signal<number | null>(null);
  readonly selectedOperarioId = signal<number | null>(null);
  readonly selectedComunidadId = signal<number | null>(null);
  readonly selectedSectorIds = signal<number[]>([]);
  readonly isAllCommunitySelected = signal<boolean>(false);
  readonly tipoActividadSeleccionada = signal<TipoRuta | null>(null);
  readonly fechaPlanificada = signal<string>(
    new Date().toISOString().slice(0, 7), // 'YYYY-MM'
  );
  readonly customNombreBase = signal<string | null>(null);
  readonly workerSearch = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  readonly tiposActividad: { value: TipoRuta; label: string; icon: string }[] = [
    { value: 'TOMA_LECTURA', label: 'Toma de Lectura', icon: 'bi-speedometer2' },
    { value: 'CORTE', label: 'Corte de Servicio', icon: 'bi-slash-circle' },
    { value: 'RECONEXION', label: 'Reconexión', icon: 'bi-arrow-repeat' },
    { value: 'INSPECCION', label: 'Inspección', icon: 'bi-search' },
    { value: 'INSTALACION', label: 'Instalación', icon: 'bi-tools' },
  ];

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

  private getTipoActividadPrefix(tipo: TipoRuta | null): string {
    if (!tipo) return 'Ruta de Trabajo';
    switch (tipo) {
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
        return 'Ruta de Trabajo';
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

  onTipoActividadChange(nuevoTipo: TipoRuta | null): void {
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

  // Validity
  readonly isFormValid = computed(() => {
    const tipo = this.tipoActividadSeleccionada();
    const period = this.selectedPeriod();
    const opId = this.selectedOperarioId();
    const comId = this.selectedComunidadId();
    const allCom = this.isAllCommunitySelected();
    const sectors = this.selectedSectorIds();

    const hasTipo = tipo !== null;
    const hasValidPeriod = period !== null && period.periodoId > 0 && period.estado === 'ABIERTO';
    const hasWorker = opId !== null && opId > 0;
    const hasComunidad = comId !== null && comId > 0;
    const hasCoverage = allCom || sectors.length > 0;

    return hasTipo && hasValidPeriod && hasWorker && hasComunidad && hasCoverage;
  });

  ngOnInit(): void {
    this.loadCatalogs();
  }

  loadCatalogs(): void {
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
    this.isAllCommunitySelected.set(false);
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

    this.dialogService
      .confirm({
        title: 'Confirmar Asignación de Rutas',
        message: `¿Estás seguro de asignar ${this.isAllCommunitySelected() ? 'toda la comunidad' : this.selectedSectorIds().length + ' sector(es)'} a ${this.getOperarioName()} para el período ${this.selectedPeriod()?.nombre}?`,
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

    const dto: ICreateRouteAssignmentsDto = {
      periodoId: this.selectedPeriodId()!,
      operarioId: this.selectedOperarioId()!,
      comunidadId: this.selectedComunidadId()!,
      tipoRuta: this.tipoActividadSeleccionada() ?? undefined,
      sectorIds: this.isAllCommunitySelected() ? undefined : this.selectedSectorIds(),
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
