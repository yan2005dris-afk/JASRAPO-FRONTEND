import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { RolesService } from '../services/roles.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  RoleDetail,
  PermissionItem,
  PermissionGroup,
  PermissionWithState,
} from '../models/role-permission.interface';

@Component({
  selector: 'app-role-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rolesService = inject(RolesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  rolId = 0;
  private originalIds = new Set<number>();

  readonly role = signal<RoleDetail | null>(null);
  readonly allPermissions = signal<PermissionItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly assignedIds = signal<Set<number>>(new Set());
  readonly expandedGroups = signal<Set<string>>(new Set());

  readonly groupedPermissions = computed((): PermissionGroup[] => {
    const perms = this.allPermissions();
    const assigned = this.assignedIds();

    const grouped = new Map<string, PermissionWithState[]>();
    for (const p of perms) {
      if (!grouped.has(p.recurso)) grouped.set(p.recurso, []);
      grouped.get(p.recurso)!.push({
        permisoId: p.permisoId,
        nombre: p.nombre,
        descripcion: p.descripcion,
        accion: p.accion,
        assigned: assigned.has(p.permisoId),
      });
    }

    return Array.from(grouped.entries()).map(([recurso, items]) => {
      const assignedCount = items.filter((p) => p.assigned).length;
      return {
        recurso,
        items,
        allSelected: assignedCount === items.length && items.length > 0,
        indeterminate: assignedCount > 0 && assignedCount < items.length,
        assignedCount,
      };
    });
  });

  readonly hasChanges = computed(() => {
    const current = this.assignedIds();
    if (current.size !== this.originalIds.size) return true;
    for (const id of current) {
      if (!this.originalIds.has(id)) return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.rolId = Number(params.get('rolId'));
      this.resetState();
      this.load();
    });
  }

  private resetState(): void {
    this.role.set(null);
    this.allPermissions.set([]);
    this.assignedIds.set(new Set());
    this.expandedGroups.set(new Set());
    this.originalIds = new Set();
  }

  private load(): void {
    this.isLoading.set(true);
    forkJoin({
      role: this.rolesService.getRoleById(this.rolId),
      permissions: this.rolesService.getAllPermissions(),
    }).subscribe({
      next: ({ role, permissions }) => {
        this.role.set(role);
        this.allPermissions.set(permissions);
        const ids = new Set(role.permisos.map((p) => p.permisoId));
        this.assignedIds.set(ids);
        this.originalIds = new Set(ids);
        this.expandedGroups.set(new Set());
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar el rol', 'Error');
        this.isLoading.set(false);
      },
    });
  }

  togglePermission(permisoId: number): void {
    this.assignedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(permisoId)) next.delete(permisoId);
      else next.add(permisoId);
      return next;
    });
  }

  toggleGroup(group: PermissionGroup): void {
    const shouldSelect = !group.allSelected;
    this.assignedIds.update((ids) => {
      const next = new Set(ids);
      group.items.forEach((p) => {
        if (shouldSelect) next.add(p.permisoId);
        else next.delete(p.permisoId);
      });
      return next;
    });
  }

  toggleExpansion(recurso: string): void {
    this.expandedGroups.update((groups) => {
      const next = new Set(groups);
      if (next.has(recurso)) next.delete(recurso);
      else next.add(recurso);
      return next;
    });
  }

  save(): void {
    const current = this.assignedIds();
    const permisosAsignar = [...current].filter((id) => !this.originalIds.has(id));
    const permisosRevocar = [...this.originalIds].filter((id) => !current.has(id));

    this.isSaving.set(true);
    this.rolesService.updateRole(this.rolId, { permisosAsignar, permisosRevocar }).subscribe({
      next: () => {
        this.originalIds = new Set(current);
        this.isSaving.set(false);
        this.toast.success('Permisos actualizados correctamente', 'Éxito');
      },
      error: () => {
        this.toast.error('Error al guardar los permisos', 'Error');
        this.isSaving.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
