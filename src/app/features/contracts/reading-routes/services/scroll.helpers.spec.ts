import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetScrollNextMicrotask } from './scroll.helpers';

describe('resetScrollNextMicrotask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a no-op when the element is null', () => {
    expect(() => resetScrollNextMicrotask(null)).not.toThrow();
    vi.runAllTimers();
  });

  it('is a no-op when the element is undefined', () => {
    expect(() => resetScrollNextMicrotask(undefined)).not.toThrow();
    vi.runAllTimers();
  });

  it('resets scrollTop to zero on the next microtask when the element is provided', () => {
    const el = { scrollTop: 250 } as HTMLElement;

    resetScrollNextMicrotask(el);

    // Not synchronous — microtask has not been flushed yet.
    expect(el.scrollTop).toBe(250);

    vi.runAllTimers();

    expect(el.scrollTop).toBe(0);
  });
});