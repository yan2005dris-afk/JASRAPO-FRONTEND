import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RolesService } from './services/roles.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { RoleListItem } from './models/role-permission.interface';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roles implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly toastService = inject(ToastService);

  readonly roles = signal<RoleListItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.rolesService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.errorMessage.set('No se pudieron cargar los roles.');
        this.toastService.error('Error al cargar los roles.', 'Error');
        this.isLoading.set(false);
      },
    });
  }
}
