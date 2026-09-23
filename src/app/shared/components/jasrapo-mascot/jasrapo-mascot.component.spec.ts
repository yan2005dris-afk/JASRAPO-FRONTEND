import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JasrapoMascotComponent } from './jasrapo-mascot.component';

describe('JasrapoMascotComponent', () => {
  let component: JasrapoMascotComponent;
  let fixture: ComponentFixture<JasrapoMascotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JasrapoMascotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JasrapoMascotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse con tamaño y valores predeterminados', () => {
    expect(component).toBeTruthy();
    expect(component.size()).toBe('lg');
    expect(component.interactive()).toBe(true);
    expect(component.expression()).toBe('happy');
    expect(component.enableTracking()).toBe(true);
    expect(component.isBouncing()).toBe(false);
    expect(component.isBlinking()).toBe(false);
    expect(component.isWiggling()).toBe(false);
    expect(component.isCurious()).toBe(false);
  });

  it('debe responder al clic emitiendo mascotClick y activando rebote', () => {
    let emitted = false;
    component.mascotClick.subscribe(() => {
      emitted = true;
    });

    component.handleClick();

    expect(emitted).toBe(true);
    expect(component.isBouncing()).toBe(true);
  });

  it('no debe emitir ni rebotar si interactive es false', () => {
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();

    let emitted = false;
    component.mascotClick.subscribe(() => {
      emitted = true;
    });

    component.handleClick();

    expect(emitted).toBe(false);
    expect(component.isBouncing()).toBe(false);
  });

  it('debe contener los elementos de pupilas móviles y cuencas oculares', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const pupilLeft = compiled.querySelector('.pupil-left');
    const pupilRight = compiled.querySelector('.pupil-right');
    const eyeSockets = compiled.querySelectorAll('.mascot-eye-socket');

    expect(pupilLeft).toBeTruthy();
    expect(pupilRight).toBeTruthy();
    expect(eyeSockets.length).toBe(2);
  });

  it('no debe incluir elementos de sonrojo en el rostro para mantener aspecto natural de agua', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cheeks = compiled.querySelector('.mascot-cheeks');
    const cheekElements = compiled.querySelectorAll('.cheek');

    expect(cheeks).toBeNull();
    expect(cheekElements.length).toBe(0);
  });

  it('debe encapsular las pupilas en contenedores con clip-path para evitar desbordes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const leftClippedGroup = compiled.querySelector('[clip-path="url(#leftEyeClip)"]');
    const rightClippedGroup = compiled.querySelector('[clip-path="url(#rightEyeClip)"]');

    expect(leftClippedGroup).toBeTruthy();
    expect(rightClippedGroup).toBeTruthy();
    expect(leftClippedGroup?.querySelector('.pupil-left')).toBeTruthy();
    expect(rightClippedGroup?.querySelector('.pupil-right')).toBeTruthy();
  });
});
