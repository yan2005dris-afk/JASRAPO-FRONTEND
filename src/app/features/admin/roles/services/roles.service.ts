import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  RoleListItem,
  PermissionItem,
  RoleDetail,
  UpdateRolePayload,
} from '../models/role-permission.interface';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly rolesUrl = `${environment.apiUrl}/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/permissions`;

  getRoles(): Observable<RoleListItem[]> {
    return this.http.get<RoleListItem[]>(this.rolesUrl, { withCredentials: true });
  }

  getRoleById(id: number): Observable<RoleDetail> {
    return this.http
      .get<RoleDetail | { data: RoleDetail }>(`${this.rolesUrl}/${id}`, { withCredentials: true })
      .pipe(
        map((res) => {
          const detail = (res && typeof res === 'object' && 'data' in res ? res.data : res) as RoleDetail;
          return {
            ...detail,
            permisos: Array.isArray(detail?.permisos) ? detail.permisos : [],
          };
        }),
      );
  }

  getAllPermissions(): Observable<PermissionItem[]> {
    const params = new HttpParams().set('limit', '1000');
    return this.http
      .get<PermissionItem[] | { data: PermissionItem[] }>(this.permissionsUrl, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res;
          if (res && typeof res === 'object' && Array.isArray((res as { data: PermissionItem[] }).data)) {
            return (res as { data: PermissionItem[] }).data;
          }
          return [];
        }),
      );
  }

  updateRole(id: number, payload: UpdateRolePayload): Observable<RoleDetail> {
    return this.http.patch<RoleDetail>(`${this.rolesUrl}/${id}`, payload, {
      withCredentials: true,
    });
  }
}
