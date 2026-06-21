import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PwaHomeComponent } from './pwa-home.component';
import { NetworkService } from '../../../core/services/network.service';
import { OperatorSyncService } from '../../../core/services/operator-sync.service';

const networkMock = { isOnline: vi.fn().mockReturnValue(true) };
const syncMock = {
  totalPending: vi.fn().mockReturnValue(0),
  totalRejected: vi.fn().mockReturnValue(0),
  totalQueued: vi.fn().mockReturnValue(0),
  isSyncing: vi.fn().mockReturnValue(false),
  refreshPendingCounts: vi.fn(),
  needsInitialSync: vi.fn().mockReturnValue(false),
  syncCatalogAndReadings: vi.fn(),
  syncPendingData: vi.fn().mockResolvedValue(undefined),
};

describe('PwaHomeComponent', () => {
  let component: PwaHomeComponent;
  let fixture: ComponentFixture<PwaHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaHomeComponent],
      providers: [
        provideRouter([]),
        { provide: NetworkService, useValue: networkMock },
        { provide: OperatorSyncService, useValue: syncMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a navigation link for Tareas pointing to /app/operador/tareas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tasksLinks = Array.from(compiled.querySelectorAll('a[routerlink]')).filter(
      (el) => el.getAttribute('routerlink') === '/app/operador/tareas',
    );
    expect(tasksLinks.length).toBeGreaterThan(0);
  });

  it('the Tareas card displays the label "Tareas" in its text content', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tasksLink = compiled.querySelector('a[routerlink="/app/operador/tareas"]');
    expect(tasksLink?.textContent).toContain('Tareas');
  });
});
