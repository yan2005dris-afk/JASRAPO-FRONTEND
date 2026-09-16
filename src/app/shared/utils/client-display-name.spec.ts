import { resolveClientDisplayName } from './client-display-name';

describe('resolveClientDisplayName', () => {
  it('corporateClientUsesDeterministicDisplayNameFallback', () => {
    expect(
      resolveClientDisplayName({
        razonSocial: '  Empresa Municipal  ',
        identificacion: '0999999999001',
      }),
    ).toBe('Empresa Municipal');
    expect(resolveClientDisplayName({ razonSocial: ' ', identificacion: '0999999999001' })).toBe(
      'Cliente 0999999999001',
    );
    expect(resolveClientDisplayName({ razonSocial: null })).toBe('Cliente sin nombre registrado');
  });
});
