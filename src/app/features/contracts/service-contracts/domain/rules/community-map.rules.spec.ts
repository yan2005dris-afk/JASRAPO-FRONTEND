import { describe, expect, it } from 'vitest';

import { COMMUNITY_MAP_CENTERS } from '../constants/community-map.constants';
import { getCommunityMapCenter } from './community-map.rules';

describe('getCommunityMapCenter', () => {
  const centerOf = (name: string) =>
    COMMUNITY_MAP_CENTERS.find((community) => community.name === name)?.center;

  it.each([
    ['Olon', 'Olón'],
    ['Curia', 'Curía'],
    ['San Jose', 'San José'],
    ['Nuñez', 'Las Núñez'],
    ['La Entrada', 'La Entrada'],
  ])('matches the stored community name %s to %s', (storedName, catalogName) => {
    expect(getCommunityMapCenter(storedName)).toBe(centerOf(catalogName));
  });

  it('ignores accents, case and surrounding whitespace', () => {
    expect(getCommunityMapCenter('  OLÓN ')).toEqual({ latitud: -1.7982, longitud: -80.7582 });
    expect(getCommunityMapCenter('las nunez')).toEqual({ latitud: -1.7425, longitud: -80.776 });
    expect(getCommunityMapCenter('SAN JOSÉ')).toEqual({ latitud: -1.7597, longitud: -80.7691 });
  });

  it('matches a longer stored name that contains the community name as whole words', () => {
    expect(getCommunityMapCenter('Comuna Olón')).toBe(centerOf('Olón'));
  });

  it.each([['Olonche'], ['Montañita'], ['Comunidad Central'], [''], ['   '], [null], [undefined]])(
    'returns null for an unknown or empty community name (%s)',
    (name) => {
      expect(getCommunityMapCenter(name)).toBeNull();
    },
  );
});
