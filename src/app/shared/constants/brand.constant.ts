export interface BrandConfig {
  readonly name: string;
  readonly shortName: string;
  readonly fullName: string;
  readonly slogan: string;
  readonly service: string;
  readonly location: string;
  readonly logoUrl: string;
  readonly fallbackLogoUrl: string;
  readonly supportEmail: string;
}

export const BRAND_CONFIG: BrandConfig = {
  name: 'JASRAPO',
  shortName: 'JASRAPO',
  fullName: 'Junta Administradora del Sistema Regional de Agua Potable',
  slogan: 'Agua pura y servicio continuo para nuestra comunidad',
  service: 'Agua Potable · Olón',
  location: 'Olón · Santa Elena, Ecuador',
  logoUrl: 'https://i.imgur.com/oHyMUhU.png',
  fallbackLogoUrl: 'assets/logo-jasrapo.png',
  supportEmail: 'soporte@jasrapo.com',
};
