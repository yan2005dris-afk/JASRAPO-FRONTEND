import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectoresFormComponent } from './sectores-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ComponentRef } from '@angular/core';
import { SectoresService } from '../../services/sectores';
import { ComunidadesService } from '../../../comunidades/services/comunidades.service';
import { vi } from 'vitest';

describe('SectoresFormComponent', () => {
  let component: SectoresFormComponent;
  let fixture: ComponentFixture<SectoresFormComponent>;
  let componentRef: ComponentRef<SectoresFormComponent>;

  const mockSectoresService = {
    createSector: vi.fn().mockReturnValue(of({})),
    updateSector: vi.fn().mockReturnValue(of({})),
  };

  const mockComunidadesService = {
    getAllComunidades: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Comunidad A' }])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectoresFormComponent, ReactiveFormsModule],
      providers: [
        { provide: SectoresService, useValue: mockSectoresService },
        { provide: ComunidadesService, useValue: mockComunidadesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectoresFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Set default input for signal
    componentRef.setInput('sectorAEditar', null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate form when empty', () => {
    expect(component.sectorForm.valid).toBe(false);
  });

  it('should validate form when filled correctly', () => {
    component.sectorForm.patchValue({
      comunidadId: 1,
      codigo: 'SEC-01',
      nombre: 'Sector Prueba',
    });
    expect(component.sectorForm.valid).toBe(true);
  });

  it('should invalidate codigo if it contains spaces', () => {
    component.sectorForm.patchValue({
      comunidadId: 1,
      codigo: 'SEC 01', // with space
      nombre: 'Sector Prueba',
    });
    expect(component.sectorForm.get('codigo')?.hasError('pattern')).toBe(true);
    expect(component.sectorForm.valid).toBe(false);
  });

  it('should emit formClosed when onClose is called', () => {
    vi.spyOn(component.formClosed, 'emit');
    component.onClose();
    expect(component.formClosed.emit).toHaveBeenCalled();
  });

  it('should prevent spaces in preventSpaces method', () => {
    const event = new KeyboardEvent('keydown', { key: ' ' });
    vi.spyOn(event, 'preventDefault');
    component.preventSpaces(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call createSector when submitting a new sector', () => {
    component.sectorForm.patchValue({
      comunidadId: 1,
      codigo: 'SEC-01',
      nombre: 'Sector Prueba',
    });
    component.onSubmit();
    expect(mockSectoresService.createSector).toHaveBeenCalled();
  });

  it('should call updateSector when submitting in edit mode', () => {
    // Set edit mode
    componentRef.setInput('sectorAEditar', {
      sectorId: 10,
      comunidadId: 1,
      codigo: 'SEC',
      nombre: 'Sector',
    });
    component.prepararFormulario();

    component.onSubmit();
    expect(mockSectoresService.updateSector).toHaveBeenCalledWith(10, expect.any(Object));
  });
});
