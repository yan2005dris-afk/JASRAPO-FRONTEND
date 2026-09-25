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
import {
  PeriodsService,
  IPeriod,
  ICreatePeriodDto,
  IUpdatePeriodDto,
  IGenerateAnnualPeriodsDto,
  EstadoPeriodo,
} from '../../../shared/services/periods.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PickerInputComponent } from '../../../shared/components/picker-input/picker-input.component';

@Component({
  selector: 'app-periods-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerInputComponent],
  templateUrl: './periods-admin.component.html',
  styleUrl: './periods-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodsAdminComponent implements OnInit {
  private readonly periodsService = inject(PeriodsService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ConfirmDialogService);

  // State
  readonly periods = signal<IPeriod[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('TODOS');

  // Modals state
  readonly showEditModal = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingPeriodId = signal<number | null>(null);

  readonly showAnnualModal = signal<boolean>(false);
  readonly isGeneratingAnnual = signal<boolean>(false);

  // Form Models
  periodForm: {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    fechaVencimiento: string;
    estado: EstadoPeriodo;
  } = {
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    fechaVencimiento: '',
    estado: 'PENDIENTE',
  };

  annualForm: {
    year: number;
    diaVencimiento: number;
    estadoInicial: EstadoPeriodo;
  } = {
    year: new Date().getFullYear(),
    diaVencimiento: 15,
    estadoInicial: 'PENDIENTE',
  };

  // Filtered Periods
  readonly filteredPeriods = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    let list = this.periods();

    if (status !== 'TODOS') {
      list = list.filter((p) => p.estado === status);
    }

    if (q) {
      list = list.filter((p) => p.nombre.toLowerCase().includes(q));
    }

    // Sort by fechaInicio desc
    return [...list].sort((a, b) => {
      const dateA = new Date(a.fechaInicio).getTime();
      const dateB = new Date(b.fechaInicio).getTime();
      return dateB - dateA;
    });
  });

  // KPIs
  readonly kpis = computed(() => {
    const list = this.periods();
    let abiertos = 0;
    let pendientes = 0;
    let cerrados = 0;
    for (const p of list) {
      if (p.estado === 'ABIERTO') abiertos++;
      else if (p.estado === 'PENDIENTE') pendientes++;
      else if (p.estado === 'CERRADO') cerrados++;
    }
    return {
      total: list.length,
      abiertos,
      pendientes,
      cerrados,
    };
  });

  ngOnInit(): void {
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.isLoading.set(true);
    this.periodsService.getAllPeriods({ limit: 100 }).subscribe({
      next: (res) => {
        this.periods.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.periods.set([]);
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingPeriodId.set(null);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const startStr = `${year}-${month}-01`;
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    const endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    let dueYear = year;
    let dueMonth = today.getMonth() + 2;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = year + 1;
    }
    const dueStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`;

    this.periodForm = {
      nombre: '',
      fechaInicio: startStr,
      fechaFin: endStr,
      fechaVencimiento: dueStr,
      estado: 'PENDIENTE',
    };
    this.showEditModal.set(true);
  }

  openEditModal(period: IPeriod): void {
    this.isEditing.set(true);
    this.editingPeriodId.set(period.periodoId);

    const parseDateToInput = (d: string | Date | undefined): string => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().slice(0, 10);
    };

    this.periodForm = {
      nombre: period.nombre,
      fechaInicio: parseDateToInput(period.fechaInicio),
      fechaFin: parseDateToInput(period.fechaFin),
      fechaVencimiento: parseDateToInput(period.fechaVencimiento),
      estado: (period.estado as EstadoPeriodo) || 'PENDIENTE',
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  savePeriod(): void {
    if (!this.periodForm.nombre.trim() || !this.periodForm.fechaInicio || !this.periodForm.fechaFin) {
      this.toastService.show('Por favor, completa todos los campos requeridos.', 'warning');
      return;
    }

    if (new Date(this.periodForm.fechaInicio) > new Date(this.periodForm.fechaFin)) {
      this.toastService.show('La fecha de inicio no puede ser posterior a la fecha de fin.', 'warning');
      return;
    }

    this.isLoading.set(true);

    if (this.isEditing() && this.editingPeriodId()) {
      const dto: IUpdatePeriodDto = {
        nombre: this.periodForm.nombre.trim(),
        fechaInicio: this.periodForm.fechaInicio,
        fechaFin: this.periodForm.fechaFin,
        fechaVencimiento: this.periodForm.fechaVencimiento,
        estado: this.periodForm.estado,
      };

      this.periodsService.updatePeriod(this.editingPeriodId()!, dto).subscribe({
        next: () => {
          this.toastService.show('Período actualizado exitosamente.', 'success');
          this.closeEditModal();
          this.loadPeriods();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show(err.error?.message || 'Error al actualizar el período', 'error');
        },
      });
    } else {
      const dto: ICreatePeriodDto = {
        nombre: this.periodForm.nombre.trim(),
        fechaInicio: this.periodForm.fechaInicio,
        fechaFin: this.periodForm.fechaFin,
        fechaVencimiento: this.periodForm.fechaVencimiento,
        estado: this.periodForm.estado,
      };

      this.periodsService.createPeriod(dto).subscribe({
        next: () => {
          this.toastService.show('Período creado exitosamente.', 'success');
          this.closeEditModal();
          this.loadPeriods();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toastService.show(err.error?.message || 'Error al crear el período', 'error');
        },
      });
    }
  }

  openAnnualModal(): void {
    this.annualForm = {
      year: new Date().getFullYear(),
      diaVencimiento: 15,
      estadoInicial: 'PENDIENTE',
    };
    this.showAnnualModal.set(true);
  }

  closeAnnualModal(): void {
    this.showAnnualModal.set(false);
  }

  executeGenerateAnnual(): void {
    if (!this.annualForm.year || this.annualForm.year < 2020 || this.annualForm.year > 2100) {
      this.toastService.show('Por favor, ingresa un año válido (ej. 2026).', 'warning');
      return;
    }

    this.isGeneratingAnnual.set(true);
    const dto: IGenerateAnnualPeriodsDto = {
      year: this.annualForm.year,
      diaVencimiento: this.annualForm.diaVencimiento || 15,
      estadoInicial: this.annualForm.estadoInicial,
    };

    this.periodsService.generateAnnualPeriods(dto).subscribe({
      next: (created) => {
        this.isGeneratingAnnual.set(false);
        this.toastService.show(
          `¡Ejercicio anual generado con éxito! ${created.length} períodos listos para el año ${dto.year}.`,
          'success',
        );
        this.closeAnnualModal();
        this.loadPeriods();
      },
      error: (err) => {
        this.isGeneratingAnnual.set(false);
        this.toastService.show(
          err.error?.message || 'Error al generar el ejercicio anual',
          'error',
        );
      },
    });
  }

  togglePeriodStatus(period: IPeriod): void {
    const nextStatus: EstadoPeriodo = period.estado === 'ABIERTO' ? 'CERRADO' : 'ABIERTO';
    const actionText = nextStatus === 'ABIERTO' ? 'abrir' : 'cerrar';

    this.dialogService
      .confirm({
        title: `¿Confirmar ${actionText} período?`,
        message: `¿Estás seguro de cambiar el estado de ${period.nombre} a ${nextStatus}?`,
        confirmText: `Sí, ${actionText}`,
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading.set(true);
          this.periodsService
            .updatePeriod(period.periodoId, { estado: nextStatus })
            .subscribe({
              next: () => {
                this.toastService.show(`Período ${period.nombre} ahora está ${nextStatus}.`, 'success');
                this.loadPeriods();
              },
              error: (err) => {
                this.isLoading.set(false);
                this.toastService.show(err.error?.message || 'Error al cambiar estado', 'error');
              },
            });
        }
      });
  }

  deletePeriod(period: IPeriod): void {
    this.dialogService
      .confirm({
        title: 'Eliminar Período',
        message: `¿Estás seguro de eliminar el período "${period.nombre}"? Esta acción no se puede deshacer.`,
        confirmText: 'Sí, Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.isLoading.set(true);
          this.periodsService.deletePeriod(period.periodoId).subscribe({
            next: () => {
              this.toastService.show('Período eliminado exitosamente.', 'success');
              this.loadPeriods();
            },
            error: (err) => {
              this.isLoading.set(false);
              this.toastService.show(err.error?.message || 'Error al eliminar el período', 'error');
            },
          });
        }
      });
  }
}
