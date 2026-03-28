import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { LayoutService } from '../../core/services/layout.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true, // Asegúrate de que sea standalone si usas Angular 19+
  imports: [RouterModule, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  readonly layoutService = inject(LayoutService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  constructor() {
    /**
     * Effect para cargar/limpiar el menú según el estado de autenticación.
     * Al usar Signals, esto reemplaza la necesidad de lógica en ngOnInit.
     */
    effect(() => {
      const user = this.authService.currentUser();

      if (user) {
        this.menuService.getMenuFromBackend().subscribe({
          error: (error: Error) => console.error('Error al cargar menú:', error),
        });
      } else {
        this.menuService.clearMenu();
      }
    });
  }
}
