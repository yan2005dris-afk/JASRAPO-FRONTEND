export interface PreInvoiceStateMeta {
  codigo: string;
  label: string;
  badgeTone: 'info' | 'warning' | 'success' | 'danger' | 'secondary';
  description: string;
}

export const PRE_INVOICE_STATES_CONFIG: Record<string, PreInvoiceStateMeta> = {
  GENERADA: {
    codigo: 'GENERADA',
    label: 'Generada',
    badgeTone: 'info',
    description: 'Prefactura recién creada por el lote de facturación',
  },
  EN_REVISION: {
    codigo: 'EN_REVISION',
    label: 'En Revisión',
    badgeTone: 'warning',
    description: 'Pendiente de aprobación o rechazo por el operador/administrador',
  },
  APROBADA: {
    codigo: 'APROBADA',
    label: 'Aprobada',
    badgeTone: 'success',
    description: 'Prefactura validada y aprobada para cobro',
  },
  RECHAZADA: {
    codigo: 'RECHAZADA',
    label: 'Rechazada',
    badgeTone: 'danger',
    description: 'Prefactura devuelta con motivo de observación',
  },
  ANULADA: {
    codigo: 'ANULADA',
    label: 'Anulada',
    badgeTone: 'danger',
    description: 'Prefactura dada de baja',
  },
  PAGADA: {
    codigo: 'PAGADA',
    label: 'Pagada',
    badgeTone: 'success',
    description: 'Prefactura cancelada en su totalidad',
  },
};
