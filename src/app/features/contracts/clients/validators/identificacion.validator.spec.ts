import { FormControl } from '@angular/forms';
import { IdentificacionUtil, identificacionValidator } from './identificacion.validator';

describe('IdentificacionUtil', () => {
  it('valida una cédula correcta', () => {
    expect(IdentificacionUtil.esCedula('1710034065')).toBe(true);
  });

  it('rechaza una cédula con dígito verificador incorrecto', () => {
    expect(IdentificacionUtil.esCedula('1710034060')).toBe(false);
  });

  it('rechaza una cédula con longitud inválida', () => {
    expect(IdentificacionUtil.esCedula('171003406')).toBe(false);
  });

  it('valida un RUC de persona natural (cédula + 001)', () => {
    expect(IdentificacionUtil.esRuc('1710034065001')).toBe(true);
  });

  it('rechaza un RUC con longitud distinta de 13', () => {
    expect(IdentificacionUtil.esRuc('1710034065')).toBe(false);
  });

  it('rechaza un RUC de persona natural sin sufijo 001', () => {
    expect(IdentificacionUtil.esRuc('1710034065999')).toBe(false);
  });

  it('validar() delega según el código del tipo', () => {
    expect(IdentificacionUtil.validar('05', '1710034065')).toBe(true);
    expect(IdentificacionUtil.validar('CEDULA', '1710034065')).toBe(true);
    expect(IdentificacionUtil.validar('04', '1710034065001')).toBe(true);
    expect(IdentificacionUtil.validar('RUC', '0000000000000')).toBe(false);
  });

  it('validar() no aplica algoritmo a pasaporte u otros tipos', () => {
    expect(IdentificacionUtil.validar('06', 'AB123')).toBe(true);
    expect(IdentificacionUtil.validar('07', 'cualquier')).toBe(true);
  });
});

describe('identificacionValidator', () => {
  it('retorna null cuando el valor está vacío (lo cubre required)', () => {
    const validator = identificacionValidator('05');
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('retorna null cuando la identificación es válida', () => {
    const validator = identificacionValidator('05');
    expect(validator(new FormControl('1710034065'))).toBeNull();
  });

  it('retorna error cuando la identificación es inválida', () => {
    const validator = identificacionValidator('05');
    expect(validator(new FormControl('1710034060'))).toEqual({
      identificacionInvalida: true,
    });
  });
});
