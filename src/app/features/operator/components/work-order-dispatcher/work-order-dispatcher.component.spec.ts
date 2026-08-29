import { TestBed } from '@angular/core/testing';
import { WorkOrderDispatcherComponent } from './work-order-dispatcher.component';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';

describe('WorkOrderDispatcherComponent', () => {
  const mockMeter: IMeterDto = {
    medidorId: 101,
    serie: 'SER-101',
    marca: 'MarcaX',
    modelo: 'Mod1',
    estado: 'ACTIVO',
    contratoId: 'CONT-1',
    clienteNombre: 'Carlos Gomez',
    fechaInstalacion: '2026-01-01',
    latitud: null,
    longitud: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkOrderDispatcherComponent],
    });
  });

  it('renders and dispatches correctly for LECTURA', () => {
    const fixture = TestBed.createComponent(WorkOrderDispatcherComponent);
    fixture.componentRef.setInput('meter', mockMeter);
    fixture.componentRef.setInput('tipoActividad', 'LECTURA');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-lectura-form')).toBeTruthy();
  });

  it('renders and dispatches correctly for INSTALACION', () => {
    const fixture = TestBed.createComponent(WorkOrderDispatcherComponent);
    fixture.componentRef.setInput('meter', mockMeter);
    fixture.componentRef.setInput('tipoActividad', 'INSTALACION');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-instalacion-form')).toBeTruthy();
  });

  it('renders and dispatches correctly for INSPECCION', () => {
    const fixture = TestBed.createComponent(WorkOrderDispatcherComponent);
    fixture.componentRef.setInput('meter', mockMeter);
    fixture.componentRef.setInput('tipoActividad', 'INSPECCION');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-inspeccion-form')).toBeTruthy();
  });

  it('renders and dispatches correctly for RECONEXION', () => {
    const fixture = TestBed.createComponent(WorkOrderDispatcherComponent);
    fixture.componentRef.setInput('meter', mockMeter);
    fixture.componentRef.setInput('tipoActividad', 'RECONEXION');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-reconexion-form')).toBeTruthy();
  });
});
