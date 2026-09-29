import type {
  ICoordinates,
  IPolygonGeometry,
} from '../../../../../shared/components/coordinate-map-picker/coordinate-map-picker.component';

export interface IServiceArea {
  nombre: string;
  fuente: string;
  geometria: IPolygonGeometry;
}

export interface ICommunityMapCenter {
  name: string;
  center: ICoordinates;
}
