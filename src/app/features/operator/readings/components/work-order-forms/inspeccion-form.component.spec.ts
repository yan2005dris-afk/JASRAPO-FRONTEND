import { TestBed } from '@angular/core/testing';
import { InspeccionFormComponent } from './inspeccion-form.component';
import type { InspeccionFormPayload } from '../../domain/work-order-form.models';

function createComponent(): InspeccionFormComponent {
  TestBed.configureTestingModule({
    imports: [InspeccionFormComponent],
  });
  const fixture = TestBed.createComponent(InspeccionFormComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('InspeccionFormComponent', () => {
  it('should be valid without activity-specific inspection fields', () => {
    const comp = createComponent();
    expect(comp.form.valid).toBe(true);
  });

  it('should not emit if photo is missing', () => {
    const comp = createComponent();
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(0);
  });

  it('should reset submitted state when a photo is captured after a failed submit', () => {
    const comp = createComponent();

    comp.submit();
    expect(comp['submitted']()).toBe(true);

    comp['onPhotoChange'](new Blob(['photo'], { type: 'image/jpeg' }));

    expect(comp['submitted']()).toBe(false);
    expect(comp.photoPreview()).toBeInstanceOf(Blob);
  });

  it('should emit correct InspeccionFormPayload with foto and observations', () => {
    const comp = createComponent();
    comp.form.patchValue({
      observaciones: 'Fuga detectada en la conexión',
    });
    comp.photoPreview.set(new Blob(['photo'], { type: 'image/jpeg' }));
    const emitted: InspeccionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('INSPECCION');
    expect(emitted[0].observaciones).toBe('Fuga detectada en la conexión');
    expect(emitted[0].fotoBlob).toBeInstanceOf(Blob);
  });
});
