import { describe, expect, it } from 'vitest';
import { resetScrollNextMicrotask } from './scroll';

describe('resetScrollNextMicrotask', () => {
  it('is a no-op when the element is null', () => {
    expect(() => resetScrollNextMicrotask(null)).not.toThrow();
  });

  it('is a no-op when the element is undefined', () => {
    expect(() => resetScrollNextMicrotask(undefined)).not.toThrow();
  });

  it('resets scrollTop to zero on the next microtask when the element is provided', async () => {
    const el = { scrollTop: 250 } as HTMLElement;

    resetScrollNextMicrotask(el);

    // Not synchronous — the microtask has not run yet.
    expect(el.scrollTop).toBe(250);

    // Flush microtasks.
    await Promise.resolve();

    expect(el.scrollTop).toBe(0);
  });
});
