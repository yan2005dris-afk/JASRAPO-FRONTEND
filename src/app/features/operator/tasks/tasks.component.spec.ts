import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { TasksComponent } from './tasks.component';
import { OperatorService } from '../service/operator.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import type { TaskResponse } from '../models/operator.models';

const makeMockTask = (overrides: Partial<TaskResponse> = {}): TaskResponse => ({
  rutaId: 'r-001',
  tipoRuta: 'TOMA_LECTURA',
  nombre: 'Ruta Norte',
  estado: 'PENDIENTE',
  orden: 1,
  operarioId: 1,
  comunidadId: 2,
  medidor: null,
  operario: { usuarioId: 1, nombres: 'Ana', apellidos: 'López' },
  ...overrides,
});

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let operatorServiceMock: { getTasks: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    operatorServiceMock = { getTasks: vi.fn().mockReturnValue(of([])) };

    const indexedDbMock = {
      getMetersCache: vi.fn().mockResolvedValue([]),
      getRegisteredReadingsCache: vi.fn().mockResolvedValue([]),
      getPendingReadings: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        { provide: OperatorService, useValue: operatorServiceMock },
        { provide: IndexedDbService, useValue: indexedDbMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
  });

  describe('filteredTasks computed signal', () => {
    it('returns all tasks when activeFilter is ALL', () => {
      const tasks = [
        makeMockTask({ rutaId: 'r-001', tipoRuta: 'TOMA_LECTURA' }),
        makeMockTask({ rutaId: 'r-002', tipoRuta: 'RECONEXION' }),
      ];
      component.tasks.set(tasks);
      component.activeFilter.set('ALL');

      expect(component.filteredTasks().length).toBe(2);
    });

    it('filters tasks by tipoRuta when activeFilter is not ALL', () => {
      const tasks = [
        makeMockTask({ rutaId: 'r-001', tipoRuta: 'TOMA_LECTURA' }),
        makeMockTask({ rutaId: 'r-002', tipoRuta: 'RECONEXION' }),
        makeMockTask({ rutaId: 'r-003', tipoRuta: 'TOMA_LECTURA' }),
      ];
      component.tasks.set(tasks);
      component.activeFilter.set('TOMA_LECTURA');

      const filtered = component.filteredTasks();
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.tipoRuta === 'TOMA_LECTURA')).toBe(true);
    });
  });

  describe('setFilter', () => {
    it('updates activeFilter signal to the given value', () => {
      component.setFilter('RECONEXION');
      expect(component.activeFilter()).toBe('RECONEXION');
    });

    it('sets activeFilter to ALL when called with ALL', () => {
      component.activeFilter.set('INSTALACION');
      component.setFilter('ALL');
      expect(component.activeFilter()).toBe('ALL');
    });
  });

  describe('toggleView', () => {
    it('switches from list to map', () => {
      component.viewMode.set('list');
      component.toggleView();
      expect(component.viewMode()).toBe('map');
    });

    it('switches from map to list', () => {
      component.viewMode.set('map');
      component.toggleView();
      expect(component.viewMode()).toBe('list');
    });
  });

  describe('ngOnInit / loadTasks', () => {
    it('calls operatorService.getTasks and populates tasks signal', async () => {
      const tasks = [makeMockTask()];
      operatorServiceMock.getTasks.mockReturnValue(of(tasks));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(operatorServiceMock.getTasks).toHaveBeenCalled();
      expect(component.tasks().length).toBe(1);
    });

    it('sets isLoading to false after tasks are loaded', async () => {
      operatorServiceMock.getTasks.mockReturnValue(of([makeMockTask()]));

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
    });
  });
});
