export interface OperatorColor {
  id: string;
  name: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
  lightBg: string;
  contrastText: string;
}

export const OPERATOR_PALETTE: OperatorColor[] = [
  {
    id: 'teal',
    name: 'Teal Corporativo',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-primary-subtle',
    textClass: 'text-primary',
    borderClass: 'border-primary',
    hex: '#087a7d',
    lightBg: '#f0fdfa',
    contrastText: '#065e60',
  },
  {
    id: 'marine',
    name: 'Slate Marino',
    badgeClass: 'text-bg-secondary',
    bgClass: 'bg-secondary-subtle',
    textClass: 'text-secondary',
    borderClass: 'border-secondary',
    hex: '#0f2938',
    lightBg: '#f1f5f9',
    contrastText: '#0f2938',
  },
  {
    id: 'blue',
    name: 'Azul Acuático',
    badgeClass: 'text-bg-info',
    bgClass: 'bg-info-subtle',
    textClass: 'text-info',
    borderClass: 'border-info',
    hex: '#0284c7',
    lightBg: '#e0f2fe',
    contrastText: '#0369a1',
  },
  {
    id: 'emerald',
    name: 'Verde Bosque',
    badgeClass: 'text-bg-success',
    bgClass: 'bg-success-subtle',
    textClass: 'text-success',
    borderClass: 'border-success',
    hex: '#15803d',
    lightBg: '#dcfce7',
    contrastText: '#166534',
  },
  {
    id: 'slate',
    name: 'Pizarra',
    badgeClass: 'text-bg-dark',
    bgClass: 'bg-light',
    textClass: 'text-dark',
    borderClass: 'border-dark-subtle',
    hex: '#475569',
    lightBg: '#f8fafc',
    contrastText: '#334155',
  },
  {
    id: 'cyan',
    name: 'Cian',
    badgeClass: 'text-bg-info',
    bgClass: 'bg-info-subtle',
    textClass: 'text-info',
    borderClass: 'border-info',
    hex: '#0c9ea1',
    lightBg: '#e6f7f8',
    contrastText: '#087a7d',
  },
  {
    id: 'indigo',
    name: 'Índigo Suave',
    badgeClass: 'text-bg-primary',
    bgClass: 'bg-primary-subtle',
    textClass: 'text-primary',
    borderClass: 'border-primary',
    hex: '#3b82f6',
    lightBg: '#eff6ff',
    contrastText: '#1d4ed8',
  },
  {
    id: 'steel',
    name: 'Acero',
    badgeClass: 'text-bg-secondary',
    bgClass: 'bg-secondary-subtle',
    textClass: 'text-secondary',
    borderClass: 'border-secondary',
    hex: '#64748b',
    lightBg: '#f1f5f9',
    contrastText: '#1e293b',
  },
];
