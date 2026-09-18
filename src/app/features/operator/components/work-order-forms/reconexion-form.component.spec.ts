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
  it('should be valid without activity-specific confirmation fields', () => {
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

  it('should emit correct ReconexionFormPayload when form is fully valid', () => {
    const comp = createComponent();
    comp.photoPreview.set(new Blob(['photo'], { type: 'image/jpeg' }));
    const emitted: ReconexionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('RECONEXION');
    expect(emitted[0].fotoBlob).toBeInstanceOf(Blob);
  });
});
