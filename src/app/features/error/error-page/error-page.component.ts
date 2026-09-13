import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-error-page',
  imports: [RouterLink],
  templateUrl: './error-page.component.html',
  styleUrl: './error-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  errorCode = 404;
  errorTitle = 'Página no encontrada';
  errorDescription = 'La página que buscas no existe o fue movida.';
  defaultRoute = '/login';

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    const state = history.state as {
      errorCode?: number;
      errorTitle?: string;
      errorDescription?: string;
    };

    if (data?.['errorCode'] === 403 || state?.errorCode === 403) {
      this.errorCode = 403;
      this.errorTitle = data?.['errorTitle'] || state?.errorTitle || 'Acceso Restringido';
      this.errorDescription =
        data?.['errorDescription'] ||
        state?.errorDescription ||
        'No dispones de las capacidades necesarias para acceder a esta sección.';
    } else if (state?.errorCode === 500) {
      this.errorCode = 500;
      this.errorTitle = 'Servidor en mantenimiento';
      this.errorDescription =
        'Estamos teniendo problemas técnicos. Por favor, intenta de nuevo más tarde.';
    }

    if (this.authService.isAuthenticated()) {
      const allowed = this.authService.getDefaultRoute();
      this.defaultRoute = allowed !== '/app/forbidden' ? allowed : '/login';
    }
  }
}
