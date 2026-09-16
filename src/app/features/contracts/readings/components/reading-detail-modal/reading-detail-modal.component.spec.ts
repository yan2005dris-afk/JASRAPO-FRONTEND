import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReadingDetailModalComponent } from './reading-detail-modal.component';

describe('ReadingDetailModalComponent', () => {
  let fixture: ComponentFixture<ReadingDetailModalComponent>;
  const reading = {
    lecturaId: '1',
    fecha: '2026-01-01',
    lecturaAnterior: 1,
    lecturaActual: 2,
    consumoCalculado: 1,
    contratoId: '1',
    isValidada: false,
    lecturaInicial: false,
    periodoId: 1,
    tieneAnomalia: false,
    estado: 'PENDIENTE',
    routeEstado: 'PARCIAL',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingDetailModalComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ReadingDetailModalComponent);
    fixture.componentRef.setInput('reading', reading);
    fixture.detectChanges();
  });

  it('does not render or emit edit outside EN_PROGRESO', () => {
    const edit = vi.fn();
    fixture.componentInstance.editRequested.subscribe(edit);
    fixture.componentInstance.requestEdit();
    expect(fixture.nativeElement.textContent).not.toContain('Editar Lectura');
    expect(edit).not.toHaveBeenCalled();
  });

  it('renders and emits edit when explicitly allowed', () => {
    const edit = vi.fn();
    fixture.componentInstance.editRequested.subscribe(edit);
    fixture.componentRef.setInput('allowEditing', true);
    fixture.detectChanges();
    fixture.componentInstance.requestEdit();
    expect(fixture.nativeElement.textContent).toContain('Editar Lectura');
    expect(edit).toHaveBeenCalledWith(reading);
  });
});
