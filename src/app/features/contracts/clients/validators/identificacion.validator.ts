import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validación de identificación ecuatoriana (cédula y RUC) con dígito
 * verificador. Refleja la misma lógica del backend (TipoIdentificacionUtil)
 * para dar feedback inmediato en el formulario.
 */
export class IdentificacionUtil {
  static esCedula(cedula: string): boolean {
    if (cedula.length !== 10 || !/^\d+$/.test(cedula)) return false;

    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    if (parseInt(cedula[2], 10) > 5) return false;

    const digitoVerificador = parseInt(cedula[9], 10);
    let total = 0;
    let coeficiente = 2;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula[i], 10) * coeficiente;
      if (valor >= 10) valor -= 9;
      total += valor;
      coeficiente = coeficiente === 2 ? 1 : 2;
    }

    const residuo = total % 10;
    const resultado = residuo === 0 ? 0 : 10 - residuo;
    return resultado === digitoVerificador;
  }

  private static validarRucPrivado(ruc: string): boolean {
    if (!ruc.endsWith('001')) return false;

    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += parseInt(ruc[i], 10) * coeficientes[i];
    }

    const residuo = suma % 11;
    let verificador = 11 - residuo;
    if (verificador === 11) verificador = 0;
    if (verificador === 10) verificador = 1;
    return verificador === parseInt(ruc[9], 10);
  }

  private static validarRucPublico(ruc: string): boolean {
    if (!ruc.endsWith('0001')) return false;

    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += parseInt(ruc[i], 10) * coeficientes[i];
    }

    const residuo = suma % 11;
    let verificador = 11 - residuo;
    if (verificador === 11) verificador = 0;
    if (verificador === 10) verificador = 1;
    return verificador === parseInt(ruc[8], 10);
  }

  static esRuc(ruc: string): boolean {
    if (!/^\d{13}$/.test(ruc)) return false;

    const provincia = parseInt(ruc.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;

    const tercerDigito = parseInt(ruc[2], 10);
    if (tercerDigito >= 0 && tercerDigito <= 5) {
      return this.esCedula(ruc.substring(0, 10)) && ruc.endsWith('001');
    }
    if (tercerDigito === 9) return this.validarRucPrivado(ruc);
    if (tercerDigito === 6) return this.validarRucPublico(ruc);
    return false;
  }

  /** Retorna true si el valor es válido para el tipo (o si el tipo no requiere algoritmo). */
  static validar(codigo: string, valor: string): boolean {
    switch (codigo) {
      case '05':
      case 'CEDULA':
        return this.esCedula(valor);
      case '04':
      case 'RUC':
        return this.esRuc(valor);
      default:
        return true;
    }
  }

  static requiereAlgoritmo(codigo: string): boolean {
    return ['04', 'RUC', '05', 'CEDULA'].includes(codigo);
  }
}

/** ValidatorFn que valida la identificación según el tipo seleccionado. */
export function identificacionValidator(codigo: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').trim();
    if (!valor) return null;
    return IdentificacionUtil.validar(codigo, valor) ? null : { identificacionInvalida: true };
  };
}
