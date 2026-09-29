import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

export const coordinatePairValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const hasLatitud = hasValue(control.get('latitud')?.value);
  const hasLongitud = hasValue(control.get('longitud')?.value);

  return hasLatitud !== hasLongitud ? { coordinatePair: true } : null;
};
