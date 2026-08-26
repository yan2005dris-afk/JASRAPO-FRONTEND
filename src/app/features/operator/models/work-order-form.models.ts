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
  nuevoSerie: string;
  lecturaInicial: number;
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
  | LecturaFormPayload
  | InstalacionFormPayload
  | InspeccionFormPayload
  | ReconexionFormPayload;
