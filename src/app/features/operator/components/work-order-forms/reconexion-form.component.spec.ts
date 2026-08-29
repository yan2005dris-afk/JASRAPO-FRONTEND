import { TestBed } from '@angular/core/testing';
import { ReconexionFormComponent } from './reconexion-form.component';
import type { ReconexionFormPayload } from '../../models/work-order-form.models';

function createComponent(): ReconexionFormComponent {
  TestBed.configureTestingModule({
    imports: [ReconexionFormComponent],
  });
  const fixture = TestBed.createComponent(ReconexionFormComponent);
  fixture.detectChanges(); // triggers ngOnInit
  return fixture.componentInstance;
}

describe('ReconexionFormComponent', () => {
  it('should be invalid when confirmacion is false', () => {
    const comp = createComponent();
    comp.form.get('confirmacionRetiroSello')?.markAsTouched();
    expect(comp.form.get('confirmacionRetiroSello')?.hasError('required')).toBe(true);
    expect(comp.form.valid).toBe(false);
  });

  it('should not emit if photo is missing even when confirmation is checked', () => {
    const comp = createComponent();
    comp.form.patchValue({ confirmacionRetiroSello: true });
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(0);
  });

  it('should emit correct ReconexionFormPayload when form is fully valid', () => {
    const comp = createComponent();
    comp.form.patchValue({ confirmacionRetiroSello: true });
    comp.photoPreview.set('data:image/jpeg;base64,rec');
    const emitted: ReconexionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('RECONEXION');
    expect(emitted[0].confirmacionRetiroSello).toBe(true);
    expect(emitted[0].fotoBase64).toBe('data:image/jpeg;base64,rec');
  });
});
