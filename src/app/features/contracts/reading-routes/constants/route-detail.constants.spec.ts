import { describe, expect, it } from 'vitest';
import {
  ESTADO_ORDEN_BADGE,
  ESTADO_FILTER_MAP,
  TIPO_ACTIVIDAD_BADGE,
  TIPO_ACTIVIDAD_LABEL,
  TIPO_RUTA_LABEL,
} from './route-detail.constants';
import {
  EstadoOrden,
  TipoActividad,
  TipoRuta,
} from '../interfaces/ireading-route.interface';

describe('route-detail.constants', () => {
  it('covers every EstadoOrden value with a badge class', () => {
    const allStates: EstadoOrden[] = [
      'PENDIENTE',
      'EN_PROGRESO',
      'COMPLETADA',
      'CANCELADA',
      'FALLIDA',
    ];
    for (const state of allStates) {
      expect(ESTADO_ORDEN_BADGE[state]).toBeTypeOf('string');
      expect(ESTADO_ORDEN_BADGE[state].length).toBeGreaterThan(0);
    }
  });

  it('covers every TipoActividad value with a badge class and a label', () => {
    const allTipos: TipoActividad[] = ['LECTURA', 'INSTALACION', 'RECONEXION', 'INSPECCION'];
    for (const tipo of allTipos) {
      expect(TIPO_ACTIVIDAD_BADGE[tipo]).toBeTypeOf('string');
      expect(TIPO_ACTIVIDAD_LABEL[tipo]).toBeTypeOf('string');
    }
  });

  it('covers every TipoRuta value with a label', () => {
    const allRutas: TipoRuta[] = [
      'TOMA_LECTURA',
      'LECTURA',
      'CORTE',
      'RECONEXION',
      'INSTALACION',
      'INSPECCION',
    ];
    for (const tipo of allRutas) {
      expect(TIPO_RUTA_LABEL[tipo]).toBeTypeOf('string');
    }
  });

  it('maps filter tabs to the backend estado query string', () => {
    expect(ESTADO_FILTER_MAP.TODAS).toBeUndefined();
    expect(ESTADO_FILTER_MAP.PENDIENTES).toBe('PENDIENTE,EN_PROGRESO');
    expect(ESTADO_FILTER_MAP.COMPLETADAS).toBe('COMPLETADA');
    expect(ESTADO_FILTER_MAP.NOVEDAD).toBe('FALLIDA');
  });
});