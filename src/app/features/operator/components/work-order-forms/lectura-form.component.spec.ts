import { TestBed } from '@angular/core/testing';
import { LecturaFormComponent } from './lectura-form.component';

function createComponent(lecturaAnterior = 0): LecturaFormComponent {
  TestBed.configureTestingModule({
    imports: [LecturaFormComponent],
  });
  const fixture = TestBed.createComponent(LecturaFormComponent);
  fixture.componentInstance.lecturaAnterior = lecturaAnterior;
  fixture.detectChanges(); // triggers ngOnInit with the @Input value
  return fixture.componentInstance;
}

describe('LecturaFormComponent', () => {
  it('should be invalid if lecturaActual is below lecturaAnterior', () => {
    const comp = createComponent(100);
    comp.form.patchValue({ lecturaActual: 50 });
    comp.form.get('lecturaActual')?.updateValueAndValidity();
    expect(comp.form.get('lecturaActual')?.hasError('lowerThanAnterior')).toBe(true);
    expect(comp.form.valid).toBe(false);
  });

  it('should be valid when lecturaInicial bypasses the anterior check', () => {
    const comp = createComponent(100);
    comp.form.patchValue({ lecturaActual: 5, lecturaInicial: true });
    comp.form.get('lecturaActual')?.updateValueAndValidity();
    expect(comp.form.get('lecturaActual')?.hasError('lowerThanAnterior')).toBeFalsy();
    expect(comp.form.valid).toBe(true);
  });

  it('should emit correct LecturaFormPayload on valid submit (with photo)', () => {
    const comp = createComponent(10);
    comp.form.patchValue({ lecturaActual: 20 });
    comp.photoPreview = 'data:image/jpeg;base64,abc';
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { tipoActividad: string }).tipoActividad).toBe('LECTURA');
    expect((emitted[0] as { lecturaActual: number }).lecturaActual).toBe(20);
    expect((emitted[0] as { fotoBase64: string }).fotoBase64).toBe('data:image/jpeg;base64,abc');
  });

  it('should not emit if form is invalid', () => {
    const comp = createComponent(0);
    comp.form.patchValue({ lecturaActual: -1 });
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(0);
  });
});
