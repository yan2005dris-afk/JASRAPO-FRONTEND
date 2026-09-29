import type { ICoordinates } from '../../../../../shared/components/coordinate-map-picker/coordinate-map-picker.component';
import { COMMUNITY_MAP_CENTERS } from '../constants/community-map.constants';

function normalizeName(name: string): string {
  return ` ${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

export function getCommunityMapCenter(name: string | null | undefined): ICoordinates | null {
  const normalized = normalizeName(name ?? '');
  if (!normalized.trim()) return null;

  const match = COMMUNITY_MAP_CENTERS.find((community) => {
    const candidate = normalizeName(community.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  return match?.center ?? null;
}
