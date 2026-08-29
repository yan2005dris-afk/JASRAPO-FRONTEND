/**
 * Typed payloads for each work-order activity form.
 * The parent component (LecturasComponent) receives one of these via the formSubmit output
 * and routes it to OperatorSyncService without needing to know the concrete type.
 */

export interface LecturaFormPayload {
  tipoActividad: 'LECTURA';
  lecturaAnterior: number;
  lecturaActual: number;
  lecturaInicial: boolean;
  descripcionAnomalia?: string;
  fotoBase64?: string | null;
}

export interface InstalacionFormPayload {
  tipoActividad: 'INSTALACION';
  resultadoObservacion?: string;
  fotoBase64: string;
}

export interface InspeccionFormPayload {
  tipoActividad: 'INSPECCION';
  estadoSellos: 'INTACTO' | 'VIOLADO' | 'AUSENTE';
  hayFugas: boolean;
  observaciones?: string;
  fotoBase64: string;
}

export interface ReconexionFormPayload {
  tipoActividad: 'RECONEXION';
  confirmacionRetiroSello: true;
  fotoBase64: string;
}

export type WorkOrderFormPayload =
  LecturaFormPayload | InstalacionFormPayload | InspeccionFormPayload | ReconexionFormPayload;

/**
 * Calcula el consumo entre la lectura anterior y la actual.
 * Si `lecturaInicial` es true, retorna 0 (se ignora la lectura anterior).
 * Si el resultado es negativo, retorna 0 (clamp defensivo).
 */
export function calculateConsumo(
  lecturaAnterior: number,
  lecturaActual: number,
  lecturaInicial: boolean,
): number {
  if (lecturaInicial) return 0;
  const diff = Number(lecturaActual) - Number(lecturaAnterior);
  return diff < 0 ? 0 : diff;
}
