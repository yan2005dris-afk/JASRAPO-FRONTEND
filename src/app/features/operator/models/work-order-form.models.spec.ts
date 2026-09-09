import { calculateConsumo } from './work-order-form.models';

describe('calculateConsumo', () => {
  it('returns positive diff when actual > anterior', () => {
    expect(calculateConsumo(100, 150, false)).toBe(50);
  });

  it('returns 0 when actual === anterior', () => {
    expect(calculateConsumo(100, 100, false)).toBe(0);
  });

  it('clamps to 0 when actual < anterior (defensive)', () => {
    expect(calculateConsumo(150, 100, false)).toBe(0);
  });

  it('returns 0 when lecturaInicial is true, even if actual < anterior', () => {
    expect(calculateConsumo(150, 100, true)).toBe(0);
  });

  it('handles decimals', () => {
    expect(calculateConsumo(100.5, 152.75, false)).toBe(52.25);
  });

  it('handles zero baseline', () => {
    expect(calculateConsumo(0, 0, false)).toBe(0);
    expect(calculateConsumo(0, 10, false)).toBe(10);
  });
});
