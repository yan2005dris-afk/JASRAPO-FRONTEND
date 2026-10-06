import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepProgressComponent } from './step-progress.component';

describe('StepProgressComponent', () => {
  let fixture: ComponentFixture<StepProgressComponent>;
  let component: StepProgressComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StepProgressComponent],
    });
    fixture = TestBed.createComponent(StepProgressComponent);
    component = fixture.componentInstance;
  });

  it('should render all steps with correct titles and count', () => {
    fixture.componentRef.setInput('steps', ['Paso 1', 'Paso 2', 'Paso 3']);
    fixture.componentRef.setInput('activeStep', 0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.step-item');
    expect(items.length).toBe(3);
    expect(items[0]?.textContent).toContain('Paso 1');
    expect(items[1]?.textContent).toContain('Paso 2');
    expect(items[2]?.textContent).toContain('Paso 3');
  });

  it('should mark active step as current with aria-current="step"', () => {
    fixture.componentRef.setInput('steps', ['Cliente', 'Medidor', 'Tarifa']);
    fixture.componentRef.setInput('activeStep', 1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.step-item');

    expect(items[0]?.classList.contains('completed')).toBe(true);
    expect(items[1]?.classList.contains('current')).toBe(true);
    expect(items[1]?.getAttribute('aria-current')).toBe('step');
    expect(items[2]?.classList.contains('current')).toBe(false);
    expect(items[2]?.classList.contains('completed')).toBe(false);
  });

  it('should show check icon for completed steps and number for remaining steps', () => {
    fixture.componentRef.setInput('steps', ['Fase 1', 'Fase 2', 'Fase 3']);
    fixture.componentRef.setInput('activeStep', 1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.step-item');

    expect(items[0]?.querySelector('i.bi-check-lg')).toBeTruthy();
    expect(items[1]?.querySelector('.step-circle')?.textContent?.trim()).toBe('2');
    expect(items[2]?.querySelector('.step-circle')?.textContent?.trim()).toBe('3');
  });

  it('should emit stepChange on click when allowDirectNavigation is true', () => {
    fixture.componentRef.setInput('steps', ['A', 'B', 'C']);
    fixture.componentRef.setInput('activeStep', 0);
    fixture.componentRef.setInput('allowDirectNavigation', true);
    fixture.detectChanges();

    let emittedStep: number | null = null;
    component.stepChange.subscribe((step) => {
      emittedStep = step;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.step-item');
    (items[2] as HTMLElement).click();

    expect(emittedStep).toBe(2);
  });

  it('should not emit stepChange on click when allowDirectNavigation is false', () => {
    fixture.componentRef.setInput('steps', ['A', 'B', 'C']);
    fixture.componentRef.setInput('activeStep', 0);
    fixture.componentRef.setInput('allowDirectNavigation', false);
    fixture.detectChanges();

    let emittedStep: number | null = null;
    component.stepChange.subscribe((step) => {
      emittedStep = step;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.step-item');
    (items[1] as HTMLElement).click();

    expect(emittedStep).toBeNull();
  });
});
