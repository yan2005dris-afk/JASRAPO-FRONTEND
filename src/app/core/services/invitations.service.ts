import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InvitationPreviewResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  PendingInvitationItem,
  ResendInvitationResponse,
} from '../models/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/auth/invitations`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  /**
   * Obtiene la vista previa de una invitación pública mediante su token
   */
  preview(token: string): Observable<InvitationPreviewResponse> {
    return this.http.get<InvitationPreviewResponse>(`${this.authUrl}/${encodeURIComponent(token)}/preview`);
  }

  /**
   * Acepta la invitación y establece la contraseña del usuario
   */
  accept(payload: AcceptInvitationRequest): Observable<AcceptInvitationResponse> {
    return this.http.post<AcceptInvitationResponse>(`${this.authUrl}/accept`, payload);
  }

  /**
   * Reenvía la invitación a un usuario existente (administrativo)
   */
  resend(usuarioId: number): Observable<ResendInvitationResponse> {
    return this.http.post<ResendInvitationResponse>(
      `${this.usersUrl}/${usuarioId}/resend-invitation`,
      {},
      { withCredentials: true },
    );
  }

  /**
   * Lista las invitaciones pendientes (administrativo)
   */
  getPending(): Observable<PendingInvitationItem[]> {
    return this.http.get<PendingInvitationItem[]>(`${this.usersUrl}/invitations/pending`, {
      withCredentials: true,
    });
  }
}
