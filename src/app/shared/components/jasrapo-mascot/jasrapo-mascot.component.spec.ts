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
});
