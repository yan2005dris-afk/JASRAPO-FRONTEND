import { HttpParams } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { buildHttpParams, ParamSerializer } from './http-params.helpers';

describe('buildHttpParams', () => {
  it('returns an empty HttpParams for null / undefined input', () => {
    expect(buildHttpParams(null).toString()).toBe('');
    expect(buildHttpParams(undefined).toString()).toBe('');
  });

  it('returns an empty HttpParams for an empty object', () => {
    expect(buildHttpParams({}).toString()).toBe('');
  });

  it('serialises each present value as String(value) in object key order', () => {
    const params = buildHttpParams({ page: 1, limit: 10, estado: 'PENDIENTE' });
    expect(params.get('page')).toBe('1');
    expect(params.get('limit')).toBe('10');
    expect(params.get('estado')).toBe('PENDIENTE');
  });

  it('skips null and undefined values (matches the original if (params?.x) guard)', () => {
    const params = buildHttpParams({
      estado: 'PENDIENTE',
      operarioId: null,
      comunidadId: undefined,
      tipoRuta: 'LECTURA',
    });
    expect(params.has('estado')).toBe(true);
    expect(params.has('operarioId')).toBe(false);
    expect(params.has('comunidadId')).toBe(false);
    expect(params.has('tipoRuta')).toBe(true);
  });

  it('uses per-key serializers when supplied', () => {
    const dateSerializer: ParamSerializer = (value) =>
      value instanceof Date ? value.toISOString() : undefined;

    const params = buildHttpParams(
      { fechaPlanificada: new Date('2026-06-15T00:00:00.000Z') },
      { fechaPlanificada: dateSerializer },
    );

    expect(params.get('fechaPlanificada')).toBe('2026-06-15T00:00:00.000Z');
  });

  it('lets a serializer return undefined to skip the parameter entirely', () => {
    const skipOnEmpty: ParamSerializer = (value) => (value === '' ? undefined : String(value));

    const params = buildHttpParams({ search: '', estado: 'OK' }, { search: skipOnEmpty });

    expect(params.has('search')).toBe(false);
    expect(params.get('estado')).toBe('OK');
  });

  it('returns a fresh HttpParams each call (no cross-call mutation)', () => {
    const first = buildHttpParams({ page: 1 });
    const second = buildHttpParams({ page: 2 });

    expect(first.get('page')).toBe('1');
    expect(second.get('page')).toBe('2');
  });

  it('uses HttpParams as the return type so it is a drop-in for http.get', () => {
    const params = buildHttpParams({ page: 1 });
    expect(params).toBeInstanceOf(HttpParams);
  });
});