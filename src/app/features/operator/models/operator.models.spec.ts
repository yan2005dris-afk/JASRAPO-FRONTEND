import { describe, it, expect } from 'vitest';

// RED: these imports WILL fail until operator.models.ts exists with the correct exports
import type { OperatorRouteResponse, ReadingWithAnomaly } from './operator.models';

describe('operator.models — type contracts', () => {
  it('OperatorRouteResponse has required fields with correct shape', () => {
    const task: OperatorRouteResponse = {
      rutaId: 'r-001',
      tipoRuta: 'LECTURA',
      nombre: 'Ruta Norte',
      estado: 'PENDIENTE',
      operarioId: 42,
      comunidadId: 7,
      medidor: null,
      operario: { usuarioId: 42, nombres: 'Ana', apellidos: 'López' },
    };

    expect(task.rutaId).toBe('r-001');
    expect(task.tipoRuta).toBe('LECTURA');
    expect(task.estado).toBe('PENDIENTE');
    expect(task.medidor).toBeNull();
  });

  it('OperatorRouteResponse medidor carries serie and work order contract carries optional coordinates', () => {
    const task: OperatorRouteResponse = {
      rutaId: 'r-002',
      tipoRuta: 'INSTALACION',
      nombre: 'Ruta Sur',
      estado: 'EN_PROGRESO',
      operarioId: 1,
      comunidadId: 2,
      medidor: { medidorId: 'M-01', serie: 'SER-123' },
      operario: { usuarioId: 1, nombres: 'Pedro', apellidos: 'García' },
      ordenesTrabajo: [
        {
          ordenTrabajoId: 'ot-001',
          rutaId: 'r-002',
          tipoActividad: 'INSTALACION',
          estado: 'PENDIENTE',
          ordenVisita: 1,
          contratoId: 'c-001',
          contrato: {
            numeroContrato: 'CNT-001',
            clienteNombre: 'Pedro García',
            direccion: 'Calle Principal 123',
            latitud: -0.5,
            longitud: -78.5,
          },
        },
      ],
    };

    expect(task.medidor?.serie).toBe('SER-123');
    expect(task.ordenesTrabajo?.[0]?.contrato?.latitud).toBe(-0.5);
    expect(task.ordenesTrabajo?.[0]?.contrato?.longitud).toBe(-78.5);
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
