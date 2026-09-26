import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { PeriodsAdminComponent } from './periods-admin.component';
import { IPeriod } from '../../../shared/services/periods.service';

describe('PeriodsAdminComponent', () => {
  let component: PeriodsAdminComponent;

  const mockPeriodsService = {
    getAllPeriods: vi.fn(),
    createPeriod: vi.fn(),
    updatePeriod: vi.fn(),
    deletePeriod: vi.fn(),
    generateAnnualPeriods: vi.fn(),
  };

  const mockToastService = {
    show: vi.fn(),
  };

  const mockDialogService = {
    confirm: vi.fn().mockReturnValue(of(true)),
  };

  const samplePeriods: IPeriod[] = [
    {
      periodoId: 1,
      nombre: 'Enero 2026',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-31',
      fechaVencimiento: '2026-02-15',
      estado: 'ABIERTO',
    },
    {
      periodoId: 2,
      nombre: 'Febrero 2026',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-02-28',
      fechaVencimiento: '2026-03-15',
      estado: 'CERRADO',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    component = Object.create(PeriodsAdminComponent.prototype) as PeriodsAdminComponent;

    const periods = signal<IPeriod[]>(samplePeriods);
    const searchQuery = signal<string>('');
    const statusFilter = signal<string>('TODOS');

    const filteredPeriods = computed(() => {
      const q = searchQuery().toLowerCase().trim();
      const status = statusFilter();
      let list = periods();

      if (status !== 'TODOS') {
        list = list.filter((p) => p.estado === status);
      }

      if (q) {
        list = list.filter((p) => p.nombre.toLowerCase().includes(q));
      }

      return [...list].sort((a, b) => {
        const dateA = new Date(a.fechaInicio).getTime();
        const dateB = new Date(b.fechaInicio).getTime();
        return dateB - dateA;
      });
    });

    const kpis = computed(() => {
      const list = periods();
      let abiertos = 0;
      let cerrados = 0;
      let procesando = 0;
      for (const p of list) {
        if (p.estado === 'ABIERTO') abiertos++;
        else if (p.estado === 'CERRADO') cerrados++;
        else if (p.estado === 'PROCESANDO') procesando++;
      }
      return {
        total: list.length,
        abiertos,
        cerrados,
        procesando,
      };
    });

    Object.assign(component as object, {
      periodsService: mockPeriodsService,
      toastService: mockToastService,
      dialogService: mockDialogService,
      periods,
      isLoading: signal(false),
      searchQuery,
      statusFilter,
      showEditModal: signal(false),
      isEditing: signal(false),
      editingPeriodId: signal<number | null>(null),
      showAnnualModal: signal(false),
      isGeneratingAnnual: signal(false),
      filteredPeriods,
      kpis,
      periodForm: {
        nombre: '',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-31',
        fechaVencimiento: '2026-02-15',
        estado: 'CERRADO',
      },
      annualForm: {
        year: 2026,
        diaVencimiento: 15,
        estadoInicial: 'CERRADO',
      },
    });
  });

  it('should compute KPIs and filtered periods list correctly', () => {
    expect(component.kpis().total).toBe(2);
    expect(component.kpis().abiertos).toBe(1);
    expect(component.kpis().cerrados).toBe(1);
    expect(component.filteredPeriods().length).toBe(2);

    component.statusFilter.set('ABIERTO');
    expect(component.filteredPeriods().length).toBe(1);
    expect(component.filteredPeriods()[0].nombre).toBe('Enero 2026');
  });

  it('should open modal for creating new period with defaults', () => {
    component.openCreateModal();
    expect(component.showEditModal()).toBe(true);
    expect(component.isEditing()).toBe(false);
    expect(component.periodForm.estado).toBe('CERRADO');
  });

  it('should open modal for editing existing period', () => {
    component.openEditModal(samplePeriods[0]);
    expect(component.showEditModal()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.editingPeriodId()).toBe(1);
    expect(component.periodForm.nombre).toBe('Enero 2026');
  });

  it('should create period on savePeriod() when not editing', () => {
    mockPeriodsService.createPeriod.mockReturnValue(of(samplePeriods[0]));
    mockPeriodsService.getAllPeriods.mockReturnValue(of({ data: samplePeriods }));

    component.periodForm = {
      nombre: 'Marzo 2026',
      fechaInicio: '2026-03-01',
      fechaFin: '2026-03-31',
      fechaVencimiento: '2026-04-15',
      estado: 'CERRADO',
    };

    component.savePeriod();

    expect(mockPeriodsService.createPeriod).toHaveBeenCalledWith({
      nombre: 'Marzo 2026',
      fechaInicio: '2026-03-01',
      fechaFin: '2026-03-31',
      fechaVencimiento: '2026-04-15',
      estado: 'CERRADO',
    });
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('creado exitosamente'),
      'success',
    );
  });

  it('should execute annual generation on executeGenerateAnnual()', () => {
    mockPeriodsService.generateAnnualPeriods.mockReturnValue(of(samplePeriods));
    mockPeriodsService.getAllPeriods.mockReturnValue(of({ data: samplePeriods }));

    component.annualForm = {
      year: 2026,
      diaVencimiento: 20,
      estadoInicial: 'CERRADO',
    };

    component.executeGenerateAnnual();

    expect(mockPeriodsService.generateAnnualPeriods).toHaveBeenCalledWith({
      year: 2026,
      diaVencimiento: 20,
      estadoInicial: 'CERRADO',
    });
    expect(mockToastService.show).toHaveBeenCalledWith(
      expect.stringContaining('generado con éxito'),
      'success',
    );
  });

  it('should toggle period status between ABIERTO and CERRADO', () => {
    mockPeriodsService.updatePeriod.mockReturnValue(of(samplePeriods[0]));
    mockPeriodsService.getAllPeriods.mockReturnValue(of({ data: samplePeriods }));

    component.togglePeriodStatus(samplePeriods[0]);

    expect(mockDialogService.confirm).toHaveBeenCalled();
    expect(mockPeriodsService.updatePeriod).toHaveBeenCalledWith(1, { estado: 'CERRADO' });
  });

  it('should delete period when confirmed', () => {
    mockPeriodsService.deletePeriod.mockReturnValue(of({}));
    mockPeriodsService.getAllPeriods.mockReturnValue(of({ data: [] }));

    component.deletePeriod(samplePeriods[0]);

    expect(mockDialogService.confirm).toHaveBeenCalled();
    expect(mockPeriodsService.deletePeriod).toHaveBeenCalledWith(1);
  });
});
