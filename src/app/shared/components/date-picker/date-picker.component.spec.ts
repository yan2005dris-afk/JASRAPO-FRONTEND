import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
  let component: DatePickerComponent;
  let fixture: ComponentFixture<DatePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DatePickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps day selection as the default', () => {
    const selected = vi.fn();
    component.valueChange.subscribe(selected);

    component.select(new Date(2026, 0, 7));

    expect(selected).toHaveBeenCalledWith('2026-01-07');
  });

  it('emits a month in month mode', () => {
    fixture.componentRef.setInput('selectionMode', 'month');
    fixture.detectChanges();
    const selected = vi.fn();
    component.valueChange.subscribe(selected);

    component.select(new Date(2026, 4, 1));

    expect(selected).toHaveBeenCalledWith('2026-05');
  });

  it('emits a year in year mode', () => {
    fixture.componentRef.setInput('selectionMode', 'year');
    fixture.detectChanges();
    const selected = vi.fn();
    component.valueChange.subscribe(selected);

    component.selectYear(2026);

    expect(selected).toHaveBeenCalledWith('2026');
  });

  it('syncs the visible view only from valid existing values', () => {
    fixture.componentRef.setInput('selectionMode', 'month');
    fixture.componentRef.setInput('value', '2026-05');
    fixture.detectChanges();
    component.isOpen.set(true);
    fixture.detectChanges();

    expect(component.viewDate().getFullYear()).toBe(2026);
    expect(component.viewDate().getMonth()).toBe(4);

    fixture.componentRef.setInput('value', '2026-13');
    fixture.detectChanges();
    expect(component.viewDate().getMonth()).toBe(4);
  });

  it('navigates from year to month to day and emits a full date', () => {
    fixture.componentRef.setInput('allowPeriodNavigation', true);
    fixture.componentRef.setInput('value', '1984-06-15');
    fixture.detectChanges();
    component.isOpen.set(true);
    fixture.detectChanges();

    component.showParentPeriod();
    expect(component.activeView()).toBe('month');
    component.showParentPeriod();
    expect(component.activeView()).toBe('year');

    component.selectYear(1990);
    expect(component.activeView()).toBe('month');
    component.select(new Date(1990, 8, 1));
    expect(component.activeView()).toBe('day');

    const selected = vi.fn();
    component.valueChange.subscribe(selected);
    component.select(new Date(1990, 8, 22));
    expect(selected).toHaveBeenCalledWith('1990-09-22');
  });

  it('keeps direct day selection when period navigation is disabled', () => {
    component.select(new Date(2026, 0, 7));
    expect(component.activeView()).toBe('day');
    expect(component.isOpen()).toBe(false);
  });
});
