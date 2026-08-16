import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetersFormComponent } from './meters-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('MetersFormComponent', () => {
  let component: MetersFormComponent;
  let fixture: ComponentFixture<MetersFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetersFormComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MetersFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el formulario para creación por defecto', () => {
    fixture.componentRef.setInput('isEdit', false);
    fixture.detectChanges();

    const serieControl = component.form.get('serie');
    const codigoControl = component.form.get('codigo');

    expect(serieControl?.validator).toBeTruthy();
    expect(codigoControl?.validator).toBeNull();
  });

  it('debería emitir saveCreate al hacer submit en modo creación', () => {
    fixture.componentRef.setInput('isEdit', false);
    fixture.detectChanges();

    vi.spyOn(component.saveCreate, 'emit');

    component.form.patchValue({
      serie: '12345',
      marca: 'TestMarca',
      modelo: 'TestModelo',
    });

    component.submit();

    expect(component.saveCreate.emit).toHaveBeenCalledWith({
      serie: '12345',
      marca: 'TestMarca',
      modelo: 'TestModelo',
    });
  });

  it('debería emitir saveEdit al hacer submit en modo edición', () => {
    fixture.componentRef.setInput('isEdit', true);
    fixture.componentRef.setInput('meter', {
      medidorId: 1,
      serie: '12345',
      marca: 'M',
      modelo: 'M',
    });
    fixture.detectChanges();

    vi.spyOn(component.saveEdit, 'emit');

    component.form.patchValue({
      codigo: 'BODEGA',
      observacion: 'Motivo de prueba',
    });

    component.submit();

    expect(component.saveEdit.emit).toHaveBeenCalledWith({
      medidorId: 1,
      estado: 'BODEGA',
      motivo: 'Motivo de prueba',
    });
  });

  it('debería emitir cancelForm al cerrar formulario', () => {
    vi.spyOn(component.cancelForm, 'emit');
    component.closeForm();
    expect(component.cancelForm.emit).toHaveBeenCalled();
  });

  it('no debería emitir ningún evento si el formulario es inválido', () => {
    vi.spyOn(component.saveCreate, 'emit');
    vi.spyOn(component.saveEdit, 'emit');

    // El formulario está vacío por defecto, por tanto es inválido
    component.submit();

    expect(component.saveCreate.emit).not.toHaveBeenCalled();
    expect(component.saveEdit.emit).not.toHaveBeenCalled();
  });

  it('no debería emitir saveEdit si no hay medidor seleccionado en modo edición', () => {
    fixture.componentRef.setInput('isEdit', true);
    fixture.componentRef.setInput('meter', null);
    fixture.detectChanges();

    vi.spyOn(component.saveEdit, 'emit');

    component.form.patchValue({
      codigo: 'BODEGA',
      observacion: 'Motivo de prueba',
    });

    component.submit();

    expect(component.saveEdit.emit).not.toHaveBeenCalled();
  });
});
