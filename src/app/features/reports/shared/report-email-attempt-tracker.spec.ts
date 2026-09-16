import { vi } from 'vitest';

import { ReportEmailAttemptTracker } from './report-email-attempt-tracker';

describe('ReportEmailAttemptTracker', () => {
  it('reuses a key only while retrying the same request payload', () => {
    const createKey = vi.fn().mockReturnValueOnce('attempt-1').mockReturnValueOnce('attempt-2');
    const tracker = new ReportEmailAttemptTracker(createKey);
    const request = {
      destinatario: 'reportes@example.com',
      filtros: { activo: false },
    };

    expect(tracker.keyFor(request)).toBe('attempt-1');
    expect(tracker.keyFor({ ...request, filtros: { activo: false } })).toBe('attempt-1');
    expect(tracker.keyFor({ ...request, filtros: { activo: true } })).toBe('attempt-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('starts a new attempt after a successful request is cleared', () => {
    const createKey = vi.fn().mockReturnValueOnce('attempt-1').mockReturnValueOnce('attempt-2');
    const tracker = new ReportEmailAttemptTracker(createKey);
    const request = { destinatario: 'reportes@example.com' };

    expect(tracker.keyFor(request)).toBe('attempt-1');
    tracker.clear();
    expect(tracker.keyFor(request)).toBe('attempt-2');
  });
});
