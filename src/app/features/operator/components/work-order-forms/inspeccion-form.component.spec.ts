import { TestBed } from '@angular/core/testing';
import { InspeccionFormComponent } from './inspeccion-form.component';
import type { InspeccionFormPayload } from '../../models/work-order-form.models';

function createComponent(): InspeccionFormComponent {
  TestBed.configureTestingModule({
    imports: [InspeccionFormComponent],
  });
  const fixture = TestBed.createComponent(InspeccionFormComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('InspeccionFormComponent', () => {
  it('should be invalid when estadoSellos is empty', () => {
    const comp = createComponent();
    expect(comp.form.get('estadoSellos')?.hasError('required')).toBe(true);
    expect(comp.form.valid).toBe(false);
  });

  it('should not emit if photo is missing', () => {
    const comp = createComponent();
    comp.form.patchValue({ estadoSellos: 'VIOLADO' });
    const emitted: unknown[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(0);
  });

  it('should emit correct InspeccionFormPayload with foto and hayFugas', () => {
    const comp = createComponent();
    comp.form.patchValue({
      estadoSellos: 'AUSENTE',
      hayFugas: true,
      observaciones: 'Fuga detectada en la conexión',
    });
    comp.photoPreview = 'data:image/jpeg;base64,xyz';
    const emitted: InspeccionFormPayload[] = [];
    comp.formSubmit.subscribe((v) => emitted.push(v));
    comp.submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tipoActividad).toBe('INSPECCION');
    expect(emitted[0].estadoSellos).toBe('AUSENTE');
    expect(emitted[0].hayFugas).toBe(true);
    expect(emitted[0].observaciones).toBe('Fuga detectada en la conexión');
    expect(emitted[0].fotoBase64).toBe('data:image/jpeg;base64,xyz');
  });
});
