export interface IPuntoEmision {
  id: number;
  codigo: string;
  descripcion?: string;
  estado: string;
}

export interface IEstablecimiento {
  id: number;
  codigo: string;
  direccion: string;
  estado: string;
  puntosEmision: IPuntoEmision[];
}

export interface ICompany {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionMatriz: string;
  obligadoContabilidad: boolean;
  contribuyenteEspecial?: string;
  agenteRetencion?: string;
  contribuyenteRimpe: boolean;
  ambiente: string;
  estado: string;
  tieneCertificado: boolean;
  certificadoValidoHasta?: string;
  certificadoSujeto?: string;
  establecimientos: IEstablecimiento[];
}

export interface IUpdateCompanyDto {
  razonSocial: string;
  nombreComercial?: string;
  direccionMatriz: string;
  obligadoContabilidad: boolean;
  contribuyenteEspecial?: string;
  agenteRetencion?: string;
  contribuyenteRimpe: boolean;
  ambiente: string;
  estado: string;
}

export interface ICreateEstablecimientoDto {
  codigo: string;
  direccion: string;
}

export interface ICreatePuntoEmisionDto {
  codigo: string;
  descripcion?: string;
}

export interface IActivePuntoEmision {
  id: number;
  codigo: string;
  descripcion?: string;
  establecimientoId: number;
  establecimientoCodigo: string;
  establecimientoDireccion: string;
  label: string;
}
