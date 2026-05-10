import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectoresPrueba } from './sectores-prueba';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectoresService } from '../../services/sectores';
import { ComunidadesService } from '../../../comunidades/services/comunidades.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { vi } from 'vitest';

describe('SectoresPrueba', () => {
  let component: SectoresPrueba;
  let fixture: ComponentFixture<SectoresPrueba>;

  const mockSectoresService = {
    getAllSectores: vi
      .fn()
      .mockReturnValue(of([{ sectorId: 1, comunidadId: 1, codigo: 'S1', nombre: 'Sector 1' }])),
    deleteSector: vi.fn().mockReturnValue(of({})),
  };

  const mockComunidadesService = {
    getAllComunidades: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Comunidad A' }])),
    getComunidadById: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Comunidad A' })),
  };

  const mockAuthService = {};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectoresPrueba, NoopAnimationsModule],
      providers: [
        { provide: SectoresService, useValue: mockSectoresService },
        { provide: ComunidadesService, useValue: mockComunidadesService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectoresPrueba);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load communities and map them on init', () => {
    expect(mockComunidadesService.getAllComunidades).toHaveBeenCalled();
    expect(component.comunidadDelSectorMapeada[1]).toBe('Comunidad A');
  });

  it('should fetch sectores when mostrarSectores is called', () => {
    component.mostrarSectores();
    expect(mockSectoresService.getAllSectores).toHaveBeenCalled();
    expect(component.sectores.length).toBe(1);
    expect(component.hasFetched).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should open modal for creation', () => {
    component.abrirModal();
    expect(component.modalMode).toBe('create');
    expect(component.objetoSectorAEditar).toBeNull();
  });

  it('should open modal for editing', () => {
    const sector = { sectorId: 1, comunidadId: 1, codigo: 'S1', nombre: 'Sector 1' };
    component.editarSector(sector);
    expect(component.modalMode).toBe('edit');
    expect(component.objetoSectorAEditar).toEqual(sector);
  });

  it('should open modal for viewing details and fetch community', () => {
    const sector = { sectorId: 1, comunidadId: 1, codigo: 'S1', nombre: 'Sector 1' };
    component.verDetalleSector(sector);

    expect(component.modalMode).toBe('view');
    expect(component.objetoSectorAEditar).toEqual(sector);
    expect(mockComunidadesService.getComunidadById).toHaveBeenCalledWith(1);
    expect(component.communitySelectedToView?.nombre).toBe('Comunidad A');
  });

  it('should call deleteSector when eliminarSector is confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const sector = { sectorId: 1, comunidadId: 1, codigo: 'S1', nombre: 'Sector 1' };

    component.eliminarSector(sector);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockSectoresService.deleteSector).toHaveBeenCalledWith(1);
    // After delete, it should fetch again
    expect(mockSectoresService.getAllSectores).toHaveBeenCalled();
  });
});
