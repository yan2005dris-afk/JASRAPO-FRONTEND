import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PaginatedUsersResponse,
  User,
  Role,
  CreateUserPayload,
  UpdateUserPayload,
} from '../models/user.interface';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private readonly rolesUrl = `${environment.apiUrl}/roles`;

  /**
   * Obtiene la lista paginada de usuarios activos.
   */
  getUsers(page = 1, limit = 10): Observable<PaginatedUsersResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<PaginatedUsersResponse>(this.usersUrl, { params, withCredentials: true });
  }

  /**
   * Obtiene un usuario específico por su ID.
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/${id}`, { withCredentials: true });
  }

  /**
   * Crea un nuevo usuario.
   */
  createUser(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.usersUrl, payload, { withCredentials: true });
  }

  /**
   * Actualiza un usuario existente por su ID.
   */
  updateUser(id: number, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.usersUrl}/${id}`, payload, { withCredentials: true });
  }

  /**
   * Elimina un usuario (soft delete).
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usersUrl}/${id}`, { withCredentials: true });
  }

  /**
   * Obtiene la lista de roles activos para asignar en los formularios.
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.rolesUrl, { withCredentials: true });
  }
}
