import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../services/users.service';
import { User, Role, CreateUserPayload, UpdateUserPayload } from '../models/user.interface';

interface UserForm {
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  rolId: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns()',
  },
})
export class UserManagement implements OnInit {
  private readonly usersService = inject(UsersService);
  readonly authService = inject(AuthService);

  // ---------- Lists & State ----------
  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
    const visible = this.pagedUsers();
    return visible.length > 0 && visible.every((u) => this.selectedIds().has(u.usuarioId));
  });

  readonly isIndeterminate = computed(() => {
    const visible = this.pagedUsers();
    const selected = visible.filter((u) => this.selectedIds().has(u.usuarioId));
    return selected.length > 0 && selected.length < visible.length;
  });

  toggleAll(): void {
    const visible = this.pagedUsers();
    if (this.isAllSelected()) {
      this.selectedIds.update((s) => {
        const n = new Set(s);
        visible.forEach((u) => n.delete(u.usuarioId));
        return n;
      });
    } else {
      this.selectedIds.update((s) => {
        const n = new Set(s);
        visible.forEach((u) => n.add(u.usuarioId));
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

  // ---------- Filtering & Search ----------
  readonly searchTerm = signal('');

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.users().filter((u) => {
      const fullName = `${u.nombres} ${u.apellidos}`.toLowerCase();
      return (
        !term ||
        fullName.includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.rol?.nombre || '').toLowerCase().includes(term)
      );
    });
  });

  // ---------- Modal state ----------
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deletingUser = signal<User | null>(null);

  readonly formData = signal<UserForm>({
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    rolId: 0,
  });

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

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.usersService.getUsers(1, 100).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.errorMessage.set('No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      },
    });
  }

  loadRoles(): void {
    this.usersService.getRoles().subscribe({
      next: (rolesList) => {
        this.roles.set(rolesList);
        if (rolesList.length > 0 && this.formData().rolId === 0) {
          this.updateField('rolId', rolesList[0].rolId);
        }
      },
      error: (err) => {
        console.error('Error al cargar roles:', err);
      },
    });
  }

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

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  // ---------- Modal Logic ----------
  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.errorMessage.set(null);

    const defaultRolId = this.roles().length > 0 ? this.roles()[0].rolId : 0;
    this.formData.set({
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      rolId: defaultRolId,
    });
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.isEditing.set(true);
    this.editingId.set(user.usuarioId);
    this.errorMessage.set(null);
    this.formData.set({
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      telefono: user.telefono || '',
      rolId: user.rol?.rolId || (this.roles().length > 0 ? this.roles()[0].rolId : 0),
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.errorMessage.set(null);
  }

  saveUser(): void {
    const form = this.formData();
    if (
      !form.nombres.trim() ||
      !form.apellidos.trim() ||
      !form.email.trim() ||
      !form.telefono.trim()
    ) {
      this.errorMessage.set('Por favor, complete todos los campos obligatorios.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.editingId() !== null) {
      const payload: UpdateUserPayload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        email: form.email,
        telefono: form.telefono,
        rolId: form.rolId,
      };

      this.usersService.updateUser(this.editingId()!, payload).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error al actualizar usuario:', err);
          this.errorMessage.set(err.error?.message || 'Error al actualizar el usuario.');
          this.isLoading.set(false);
        },
      });
    } else {
      const payload: CreateUserPayload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        email: form.email,
        telefono: form.telefono,
        rolId: form.rolId,
      };

      this.usersService.createUser(payload).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error al crear usuario:', err);
          this.errorMessage.set(err.error?.message || 'Error al crear el usuario.');
          this.isLoading.set(false);
        },
      });
    }
  }

  confirmDelete(user: User): void {
    this.deletingUser.set(user);
    this.showDeleteModal.set(true);
    this.errorMessage.set(null);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deletingUser.set(null);
    this.errorMessage.set(null);
  }

  deleteUser(): void {
    const target = this.deletingUser();
    if (!target) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.usersService.deleteUser(target.usuarioId).subscribe({
      next: () => {
        this.loadUsers();
        this.cancelDelete();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        this.errorMessage.set(err.error?.message || 'Error al eliminar el usuario.');
        this.isLoading.set(false);
      },
    });
  }

  updateField<K extends keyof UserForm>(field: K, value: UserForm[K]): void {
    this.formData.update((f) => ({ ...f, [field]: value }));
  }
}
