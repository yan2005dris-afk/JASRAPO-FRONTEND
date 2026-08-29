import { describe, it, expect } from 'vitest';

// RED: these imports WILL fail until operator.models.ts exists with the correct exports
import type { OperatorRouteResponse, ReadingWithAnomaly } from './operator.models';

describe('operator.models — type contracts', () => {
  it('OperatorRouteResponse has required fields with correct shape', () => {
    const task: OperatorRouteResponse = {
      rutaId: 'r-001',
      tipoRuta: 'TOMA_LECTURA',
      nombre: 'Ruta Norte',
      estado: 'PENDIENTE',
      orden: 1,
      operarioId: 42,
      comunidadId: 7,
      medidor: null,
      operario: { usuarioId: 42, nombres: 'Ana', apellidos: 'López' },
    };

    expect(task.rutaId).toBe('r-001');
    expect(task.tipoRuta).toBe('TOMA_LECTURA');
    expect(task.estado).toBe('PENDIENTE');
    expect(task.orden).toBe(1);
    expect(task.medidor).toBeNull();
  });

  it('OperatorRouteResponse medidor field carries serie and optional coordinates', () => {
    const task: OperatorRouteResponse = {
      rutaId: 'r-002',
      tipoRuta: 'INSTALACION',
      nombre: 'Ruta Sur',
      estado: 'EN_PROGRESO',
      orden: 2,
      operarioId: 1,
      comunidadId: 2,
      medidor: { medidorId: 'M-01', serie: 'SER-123', latitud: -0.5, longitud: -78.5 },
      operario: { usuarioId: 1, nombres: 'Pedro', apellidos: 'García' },
    };

    expect(task.medidor?.serie).toBe('SER-123');
    expect(task.medidor?.latitud).toBe(-0.5);
  });

  it('ReadingWithAnomaly has required fields with correct shape', () => {
    const reading: ReadingWithAnomaly = {
      lecturaId: 'l-001',
      medidorId: null,
      medidorSerie: 'SER-001',
      fecha: '2026-06-15T10:00:00Z',
      estado: 'PROCESADA',
      anomalias: [{ tipo: 'FUGA', observacion: 'Fuga en tubería', estado: 'PENDIENTE' }],
    };

    expect(reading.lecturaId).toBe('l-001');
    expect(reading.anomalias).toHaveLength(1);
    expect(reading.anomalias[0].tipo).toBe('FUGA');
  });
});
