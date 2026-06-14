import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RolesService } from '../services/roles.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  AllPermission,
  PermissionGroup,
  RoleDetail,
} from '../models/role-permission.interface';

@Component({
  selector: 'app-role-editor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './role-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleEditor {
  private readonly rolesService = inject(RolesService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly role = signal<RoleDetail | null>(null);
  readonly allPermissions = signal<AllPermission[]>([]);
  readonly assignedIds = signal<Set<number>>(new Set());
  readonly expandedGroups = signal<Set<string>>(new Set());
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  private originalIds = new Set<number>();

  readonly groupedPermissions = computed<PermissionGroup[]>(() => {
    const assigned = this.assignedIds();
    const perms = this.allPermissions();
    const grouped = new Map<string, AllPermission[]>();

    for (const p of perms) {
      const group = grouped.get(p.recurso) ?? [];
      group.push(p);
      grouped.set(p.recurso, group);
    }

    return Array.from(grouped.entries()).map(([recurso, items]) => {
      const withState = items.map((p) => ({ ...p, assigned: assigned.has(p.permisoId) }));
      const assignedCount = withState.filter((p) => p.assigned).length;
      const allSelected = assignedCount === items.length;
      const indeterminate = assignedCount > 0 && assignedCount < items.length;
      return { recurso, items: withState, allSelected, indeterminate, assignedCount };
    });
  });

  readonly hasChanges = computed(() => {
    const current = this.assignedIds();
    const original = this.originalIds;
    if (current.size !== original.size) return true;
    for (const id of current) {
      if (!original.has(id)) return true;
    }
    return false;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rolId = Number(params.get('rolId'));
      if (!rolId) return;
      this.loadRole(rolId);
    });
  }

  private loadRole(rolId: number): void {
    this.isLoading.set(true);

    forkJoin([
      this.rolesService.getRoleById(rolId),
      this.rolesService.getAllPermissions(),
    ]).subscribe({
      next: ([role, permissions]) => {
        this.role.set(role);
        this.allPermissions.set(permissions);

        const ids = new Set<number>(role.permisos.map((p) => p.permisoId));
        this.assignedIds.set(ids);
        this.originalIds = new Set(ids);
        this.expandedGroups.set(new Set());
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading role:', err);
        this.toastService.error('Error al cargar los permisos del rol.', 'Error');
        this.isLoading.set(false);
      },
    });
  }

  toggleGroup(recurso: string): void {
    this.expandedGroups.update((s) => {
      const next = new Set(s);
      if (next.has(recurso)) {
        next.delete(recurso);
      } else {
        next.add(recurso);
      }
      return next;
    });
  }

  isExpanded(recurso: string): boolean {
    return this.expandedGroups().has(recurso);
  }

  togglePermission(permisoId: number): void {
    this.assignedIds.update((s) => {
      const next = new Set(s);
      if (next.has(permisoId)) {
        next.delete(permisoId);
      } else {
        next.add(permisoId);
      }
      return next;
    });
  }

  toggleGroupAll(group: PermissionGroup): void {
    this.assignedIds.update((s) => {
      const next = new Set(s);
      if (group.allSelected) {
        group.items.forEach((p) => next.delete(p.permisoId));
      } else {
        group.items.forEach((p) => next.add(p.permisoId));
      }
      return next;
    });
  }

  save(): void {
    const role = this.role();
    if (!role) return;

    const current = this.assignedIds();
    const original = this.originalIds;

    const permisosAsignar = [...current].filter((id) => !original.has(id));
    const permisosRevocar = [...original].filter((id) => !current.has(id));

    this.isSaving.set(true);
    this.rolesService
      .updateRole(role.rolId, { permisosAsignar, permisosRevocar })
      .subscribe({
        next: (updated) => {
          this.role.set(updated);
          const ids = new Set<number>(updated.permisos.map((p) => p.permisoId));
          this.assignedIds.set(ids);
          this.originalIds = new Set(ids);
          this.toastService.success('Permisos actualizados correctamente.', 'Éxito');
          this.isSaving.set(false);
        },
        error: (err) => {
          console.error('Error saving role:', err);
          const msg = err.error?.message || 'Error al guardar los permisos.';
          this.toastService.error(msg, 'Error');
          this.isSaving.set(false);
        },
      });
  }
}
