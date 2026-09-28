import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-operator-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './operator-profile.component.html',
  styleUrl: './operator-profile.component.scss',
})
export class OperatorProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => {
    const user = this.authService.currentUser();
    const nombre = user?.name ? user.name.trim() : (user?.email?.split('@')[0] ?? 'Carlos M.');
    return {
      nombre,
      email: user?.email ?? 'operador@jasrapo.gob.ec',
      rol: user?.roleName || 'Operador de Campo',
      telefono: '+593 98 765 4321',
    };
  });

  readonly userInitials = computed(() => {
    const nombre = this.currentUser().nombre;
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.slice(0, 2).toUpperCase() || 'OP';
  });

  goBack(): void {
    this.router.navigate(['/app/operador/inicio']);
  }

  onLogout(): void {
    this.authService.logout();
  }
}
