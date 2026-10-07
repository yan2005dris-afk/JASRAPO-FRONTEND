import { calculateConsumo } from './work-order-form.models';

describe('calculateConsumo', () => {
  it('returns positive diff when actual > anterior', () => {
    expect(calculateConsumo(100, 150)).toBe(50);
  });

  it('returns 0 when actual === anterior', () => {
    expect(calculateConsumo(100, 100)).toBe(0);
  });

  it('clamps to 0 when actual < anterior (defensive)', () => {
    expect(calculateConsumo(150, 100)).toBe(0);
  });

  it('handles decimals', () => {
    expect(calculateConsumo(100.5, 152.75)).toBe(52.25);
  });

  it('handles zero baseline', () => {
    expect(calculateConsumo(0, 0)).toBe(0);
    expect(calculateConsumo(0, 10)).toBe(10);
  });
});
