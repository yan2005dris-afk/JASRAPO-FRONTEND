import { TestBed } from '@angular/core/testing';
import { InstalacionFormComponent } from './instalacion-form.component';
import type { InstalacionFormPayload } from '../../domain/work-order-form.models';

function createComponent(): InstalacionFormComponent {
  TestBed.configureTestingModule({
    imports: [InstalacionFormComponent],
  });
  const fixture = TestBed.createComponent(InstalacionFormComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('InstalacionFormComponent', () => {
  it('should only collect installation observations and not meter registration fields', () => {
    const comp = createComponent();

    expect(comp.form.get('nuevoSerie')).toBeNull();
    expect(comp.form.get('lecturaInicial')).toBeNull();
    expect(comp.form.get('observaciones')).not.toBeNull();
    expect(comp.form.valid).toBe(true);
  });

  it('should not emit if photo is missing', () => {
    const comp = createComponent();
    comp.form.patchValue({ observaciones: 'Instalación en gabinete exterior.' });
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

  it('should emit correct InstalacionFormPayload on valid submit', () => {
    const comp = createComponent();
    comp.form.patchValue({ observaciones: 'Instalación ejecutada sin incidencias.' });
    comp.photoPreview.set(new Blob(['photo'], { type: 'image/jpeg' }));
    const emitted: InstalacionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('INSTALACION');
    expect(emitted[0].resultadoObservacion).toBe('Instalación ejecutada sin incidencias.');
    expect(emitted[0].fotoBlob).toBeInstanceOf(Blob);
  });

  it('should omit empty installation observations from the payload', () => {
    const comp = createComponent();
    comp.photoPreview.set(new Blob(['photo'], { type: 'image/jpeg' }));
    const emitted: InstalacionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();

    expect(emitted[0]).toEqual({
      tipoActividad: 'INSTALACION',
      fotoBlob: expect.any(Blob),
    });
  });
});
