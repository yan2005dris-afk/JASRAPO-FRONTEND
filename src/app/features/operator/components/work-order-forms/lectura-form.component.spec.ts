import { TestBed } from '@angular/core/testing';
import { LecturaFormComponent } from './lectura-form.component';

function createComponent(lecturaAnterior = 0): LecturaFormComponent {
  TestBed.configureTestingModule({
    imports: [LecturaFormComponent],
  });
  const fixture = TestBed.createComponent(LecturaFormComponent);
  fixture.componentRef.setInput('lecturaAnterior', lecturaAnterior);
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

  it('should reset submitted state when a photo is captured after a failed submit', () => {
    const comp = createComponent();

    comp.submit();
    expect(comp['submitted']()).toBe(true);

    const photoBlob = new Blob(['photo'], { type: 'image/jpeg' });
    comp['onPhotoChange'](photoBlob);

    expect(comp['submitted']()).toBe(false);
    expect(comp.photoPreview()).toBe(photoBlob);
  });

  it('should emit correct LecturaFormPayload on valid submit (with photo)', () => {
    const comp = createComponent(10);
    comp.form.patchValue({ lecturaActual: 20 });
    const photoBlob = new Blob(['photo'], { type: 'image/jpeg' });
    comp.photoPreview.set(photoBlob);
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { tipoActividad: string }).tipoActividad).toBe('LECTURA');
    expect((emitted[0] as { lecturaActual: number }).lecturaActual).toBe(20);
    expect((emitted[0] as { fotoBlob: Blob }).fotoBlob).toBe(photoBlob);
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
