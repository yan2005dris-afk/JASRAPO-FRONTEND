import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    const defaultRoute = this.authService.getDefaultRoute();
    if (defaultRoute !== '/app/dashboard') {
      void this.router.navigate([defaultRoute]);
    }
  }

  // Probar el spinner de forma manual ("estatica")
  // readonly spinnerService = inject(SpinnerService);

  // ngOnInit() {
  //   this.spinnerService.loadingOn();
  //   setTimeout(() => this.spinnerService.loadingOff(), 2000);
  // }

  // Llamada a una API publica para probar el spinner (forma "dinamica")
  // readonly #http = inject(HttpClient);
  // ngOnInit() {
  //   // Llama a una API pública de prueba — el interceptor activa el spinner solo
  //   this.#http.get('https://jsonplaceholder.typicode.com/posts').subscribe();

  // }
}
