import { TestBed } from '@angular/core/testing';
import { InstalacionFormComponent } from './instalacion-form.component';
import type { InstalacionFormPayload } from '../../models/work-order-form.models';

function createComponent(): InstalacionFormComponent {
  TestBed.configureTestingModule({
    imports: [InstalacionFormComponent],
  });
  const fixture = TestBed.createComponent(InstalacionFormComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('InstalacionFormComponent', () => {
  it('should be invalid when nuevoSerie is empty', () => {
    const comp = createComponent();
    expect(comp.form.get('nuevoSerie')?.hasError('required')).toBe(true);
    expect(comp.form.valid).toBe(false);
  });

  it('should not emit if photo is missing', () => {
    const comp = createComponent();
    comp.form.patchValue({ nuevoSerie: 'MED-001', lecturaInicial: 10 });
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(0);
  });

  it('should emit correct InstalacionFormPayload on valid submit', () => {
    const comp = createComponent();
    comp.form.patchValue({ nuevoSerie: 'MED-001', lecturaInicial: 5 });
    comp.photoPreview = 'data:image/jpeg;base64,abc';
    const emitted: InstalacionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('INSTALACION');
    expect(emitted[0].nuevoSerie).toBe('MED-001');
    expect(emitted[0].lecturaInicial).toBe(5);
    expect(emitted[0].fotoBase64).toBe('data:image/jpeg;base64,abc');
  });
});
