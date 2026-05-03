import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ComunidadesService } from './services/comunidades.service';
import { IComunidades } from './interfaces/icomunidades.interface';

@Component({
  selector: 'app-comunidades',
  imports: [],
  templateUrl: './comunidades.component.html',
  styleUrl: './comunidades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComunidadesComponent {

  private readonly comunidadesService = inject(ComunidadesService);

  comunidades = signal<IComunidades[]>([]);

  hasFetched = signal(false);

  getAllComunidades(): void {
    this.comunidadesService.getAllComunidades().subscribe({
      next: (data: IComunidades[]) => {
        console.log(data);
        this.comunidades.set(data);
        this.hasFetched.set(true);
      },
      
      error: (err: any) => {
        console.error('Error al obtener comunidades:', err);
      },
    });
  }

}