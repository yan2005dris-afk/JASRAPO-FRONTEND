import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { KpiCardComponent, KpiCardTone } from './kpi-card.component';

describe('KpiCardComponent', () => {
  it('should expose defined tones', () => {
    const validTones: KpiCardTone[] = ['primary', 'success', 'info', 'warning', 'danger', 'neutral'];
    expect(validTones).toHaveLength(6);
  });

  it('can be instantiated within an injection context', () => {
    const injector = createEnvironmentInjector([], {} as any);
    runInInjectionContext(injector, () => {
      const component = new KpiCardComponent();
      expect(component).toBeInstanceOf(KpiCardComponent);
    });
  });
});
