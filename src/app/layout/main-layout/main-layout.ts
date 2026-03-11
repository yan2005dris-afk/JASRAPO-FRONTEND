import { Component, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { LayoutService } from '../../core/services/layout.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterModule, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayout implements OnInit {
  readonly layoutService = inject(LayoutService);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  constructor() {
    // Effect para cargar/limpiar el menú según el estado de autenticación
    effect(() => {
      const user = this.authService.currentUser();

      if (user) {
        // Usuario autenticado: cargar menú
        this.menuService.getMenuFromBackend().subscribe({
          // next: (menu) => console.log('Menú cargado:', menu),
          error: (error) => console.error('Error al cargar menú:', error)
        });
      } else {
        // Usuario no autenticado: limpiar menú
        this.menuService.clearMenu();
      }
    });
  }

  ngOnInit(): void {
    // El effect en el constructor manejará la carga inicial del menú
  }
}
