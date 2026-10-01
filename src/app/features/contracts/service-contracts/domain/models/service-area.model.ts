export interface ICoordinates {
  latitud: number | null;
  longitud: number | null;
}

export interface IPolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface IServiceArea {
  nombre: string;
  fuente: string;
  geometria: IPolygonGeometry;
}

export interface ICommunityMapCenter {
  name: string;
  center: ICoordinates;
}
