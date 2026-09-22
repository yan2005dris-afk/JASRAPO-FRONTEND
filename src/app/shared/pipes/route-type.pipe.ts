import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'routeType',
  standalone: true,
})
export class RouteTypePipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    LECTURA: 'Lectura',
    TOMA_LECTURA: 'Lectura',
    RECONEXION: 'Reconexión',
    INSTALACION: 'Instalación',
    INSPECCION: 'Inspección',
  };

  transform(value: string | undefined | null): string {
    if (!value) return '';
    return this.labels[value] ?? value;
  }
}
