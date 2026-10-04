/**
 * Typed payloads for each work-order activity form.
 * The parent component (LecturasComponent) receives one of these via the formSubmit output
 * and routes it to OperatorSyncService without needing to know the concrete type.
 */

export interface LecturaFormPayload {
  tipoActividad: 'LECTURA';
  lecturaAnterior: number;
  lecturaActual: number;
  descripcionAnomalia?: string;
  fotoBlob?: Blob | null;
}

export interface InstalacionFormPayload {
  tipoActividad: 'INSTALACION';
  resultadoObservacion?: string;
  fotoBlob: Blob;
}

export interface InspeccionFormPayload {
  tipoActividad: 'INSPECCION';
  observaciones?: string;
  fotoBlob: Blob;
}

export interface ReconexionFormPayload {
  tipoActividad: 'RECONEXION';
  fotoBlob: Blob;
}

export type WorkOrderFormPayload =
  LecturaFormPayload | InstalacionFormPayload | InspeccionFormPayload | ReconexionFormPayload;

/**
 * Calcula el consumo entre la lectura anterior y la actual.
 * Si el resultado es negativo, retorna 0 (clamp defensivo).
 */
export function calculateConsumo(lecturaAnterior: number, lecturaActual: number): number {
  const diff = Number(lecturaActual) - Number(lecturaAnterior);
  return diff < 0 ? 0 : diff;
}
