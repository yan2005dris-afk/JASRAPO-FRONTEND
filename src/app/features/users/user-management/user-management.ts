import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'Admin' | 'Presidente' | 'Secretario' | 'Tesorero';
  estado: 'Activo' | 'Inactivo';
}

type UserForm = Omit<User, 'id'> & { password?: string };

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class UserManagement {
  readonly authService = inject(AuthService);

  // ---------- Dropdown ----------
  readonly openDropdownId = signal<number | null>(null);

  closeDropdowns(): void {
    this.openDropdownId.set(null);
  }

  toggleDropdown(userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update((id) => (id === userId ? null : userId));
  }

  // ---------- Selection ----------
  readonly selectedIds = signal<Set<number>>(new Set());

  readonly isAllSelected = computed(() => {
    const visible = this.pagedUsers(); // Solo los visibles en la página actual
    return visible.length > 0 && visible.every((u) => this.selectedIds().has(u.id));
  });

  readonly isIndeterminate = computed(() => {
    const visible = this.pagedUsers();
    const selected = visible.filter((u) => this.selectedIds().has(u.id));
    return selected.length > 0 && selected.length < visible.length;
  });

  toggleAll(): void {
    const visible = this.pagedUsers();
    if (this.isAllSelected()) {
      this.selectedIds.update((s) => {
        const n = new Set(s);
        visible.forEach((u) => n.delete(u.id));
        return n;
      });
    } else {
      this.selectedIds.update((s) => {
        const n = new Set(s);
        visible.forEach((u) => n.add(u.id));
        return n;
      });
    }
  }

  toggleUser(userId: number): void {
    this.selectedIds.update((s) => {
      const n = new Set(s);
      if (n.has(userId)) {
        n.delete(userId);
      } else {
        n.add(userId);
      }
      return n;
    });
  }

  // ---------- Data ----------
  private readonly nextId = signal(6);

  readonly users = signal<User[]>([
    {
      id: 1,
      nombre: 'Administrador JAPO',
      email: 'admin@japo.com',
      rol: 'Admin',
      estado: 'Activo',
    },
    {
      id: 2,
      nombre: 'Carlos Mendoza',
      email: 'presidente@japo.com',
      rol: 'Presidente',
      estado: 'Activo',
    },
    {
      id: 3,
      nombre: 'María González',
      email: 'secretario@japo.com',
      rol: 'Secretario',
      estado: 'Activo',
    },
    {
      id: 4,
      nombre: 'Roberto Silva',
      email: 'tesorero@japo.com',
      rol: 'Tesorero',
      estado: 'Activo',
    },
    {
      id: 5,
      nombre: 'Invitado Demo',
      email: 'demo@japo.com',
      rol: 'Secretario',
      estado: 'Inactivo',
    },
  ]);

  // ---------- Filtering & Search ----------
  readonly searchTerm = signal('');
  readonly activeFilter = signal<'Todos' | 'Activo' | 'Inactivo'>('Todos');

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.activeFilter();
    return this.users().filter((u) => {
      const matchSearch =
        !term ||
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.rol.toLowerCase().includes(term);
      const matchFilter = filter === 'Todos' || u.estado === filter;
      return matchSearch && matchFilter;
    });
  });

  // ---------- Modal state ----------
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deletingUser = signal<User | null>(null);

  readonly formData = signal<UserForm>({
    nombre: '',
    email: '',
    password: '',
    rol: 'Secretario',
    estado: 'Activo',
  });

  readonly roles: User['rol'][] = ['Admin', 'Presidente', 'Secretario', 'Tesorero'];

  // ---------- Pagination ----------
  readonly pageSizeOptions = [5, 10, 15];
  readonly pageSize = signal(5);
  readonly currentPage = signal(1);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize())),
  );

  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.selectedIds.set(new Set());
  }

  setFilter(filter: 'Todos' | 'Activo' | 'Inactivo'): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  // ---------- Modal Logic ----------
  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formData.set({ nombre: '', email: '', password: '', rol: 'Secretario', estado: 'Activo' });
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.isEditing.set(true);
    this.editingId.set(user.id);
    this.formData.set({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol,
      estado: user.estado,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveUser(): void {
    const form = this.formData();
    if (!form.nombre.trim() || !form.email.trim()) return;

    if (this.isEditing() && this.editingId() !== null) {
      this.users.update((list) =>
        list.map((u) =>
          u.id === this.editingId()
            ? { ...u, nombre: form.nombre, email: form.email, rol: form.rol, estado: form.estado }
            : u,
        ),
      );
    } else {
      const id = this.nextId();
      this.nextId.update((n) => n + 1);
      this.users.update((list) => [
        ...list,
        {
          id,
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          estado: form.estado,
        },
      ]);
    }
    this.closeModal();
  }

  confirmDelete(user: User): void {
    this.deletingUser.set(user);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deletingUser.set(null);
  }

  deleteUser(): void {
    const target = this.deletingUser();
    if (!target) return;
    this.users.update((list) => list.filter((u) => u.id !== target.id));
    this.cancelDelete();
  }

  updateField<K extends keyof UserForm>(field: K, value: UserForm[K]): void {
    this.formData.update((f) => ({ ...f, [field]: value }));
  }
}
