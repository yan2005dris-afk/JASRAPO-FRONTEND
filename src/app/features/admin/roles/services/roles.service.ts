import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  AllPermission,
  RoleDetail,
  RoleListItem,
  UpdateRolePayload,
} from '../models/role-permission.interface';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly rolesUrl = `${environment.apiUrl}/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/permissions`;

  getRoles(): Observable<RoleListItem[]> {
    return this.http
      .get<RoleListItem[] | { data: RoleListItem[] }>(this.rolesUrl, { withCredentials: true })
      .pipe(map((res) => (Array.isArray(res) ? res : (res.data ?? []))));
  }

  getRoleById(id: number): Observable<RoleDetail> {
    return this.http.get<RoleDetail>(`${this.rolesUrl}/${id}`, { withCredentials: true });
  }

  getAllPermissions(): Observable<AllPermission[]> {
    const params = new HttpParams().set('limit', '200');
    return this.http
      .get<AllPermission[] | { data: AllPermission[] }>(this.permissionsUrl, {
        params,
        withCredentials: true,
      })
      .pipe(map((res) => (Array.isArray(res) ? res : (res.data ?? []))));
  }

  updateRole(id: number, payload: UpdateRolePayload): Observable<RoleDetail> {
    return this.http.patch<RoleDetail>(`${this.rolesUrl}/${id}`, payload, {
      withCredentials: true,
    });
  }
}
