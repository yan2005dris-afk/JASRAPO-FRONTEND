import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export class InvitationNotFoundError extends Error {
  constructor(message = 'Invitación inválida') {
    super(message);
    this.name = 'InvitationNotFoundError';
  }
}

export class InvitationGoneError extends Error {
  constructor(message = 'Esta invitación ya fue usada o expiró') {
    super(message);
    this.name = 'InvitationGoneError';
  }
}

export interface InvitationPreview {
  email?: string;
  nombres?: string;
  apellidos?: string;
  expiresAt: string;
  organization?: {
    name: string;
    initials?: string;
  };
  invitedBy?: {
    name: string;
    role?: string;
  };
  role?: string;
  issuedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InvitationsService {
  constructor(private http: HttpClient) {}

  async previewInvitation(token: string): Promise<InvitationPreview | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<InvitationPreview>(`/api/v1/auth/invitations/${token}/preview`)
      );
      return response;
    } catch (err: any) {
      if (err.status === 404) {
        throw new InvitationNotFoundError();
      }
      if (err.status === 410) {
        throw new InvitationGoneError();
      }
      console.warn('[invitations.service] preview error', err);
      return null;
    }
  }

  async acceptInvitation(
    token: string,
    password: string,
    passwordConfirmation: string,
    acceptTerms: boolean,
    termsVersion: string = 'v0'
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`/api/v1/auth/invitations/accept`, {
          token,
          password,
        })
      );
      return response;
    } catch (err: any) {
      if (err.status === 404) {
        throw new InvitationNotFoundError();
      }
      if (err.status === 410) {
        throw new InvitationGoneError();
      }
      if (err.status === 422) {
        throw { status: 422, errors: err.error.errors };
      }
      throw err;
    }
  }

  validateAcceptPayload(payload: {
    password?: string;
    passwordConfirmation?: string;
    acceptTerms?: boolean;
  }): Record<string, string> {
    const errors: Record<string, string> = {};

    const pw = payload.password || '';
    if (pw.length < 8) {
      errors['password'] = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/[A-Z]/.test(pw)) {
      errors['password'] = 'La contraseña debe incluir al menos una mayúscula.';
    } else if (!/[a-z]/.test(pw)) {
      errors['password'] = 'La contraseña debe incluir al menos una minúscula.';
    } else if (!/[0-9]/.test(pw)) {
      errors['password'] = 'La contraseña debe incluir al menos un dígito.';
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) {
      errors['password'] = 'La contraseña debe incluir al menos un carácter especial (!@#$%^&* etc).';
    }

    if (!payload.passwordConfirmation || payload.passwordConfirmation !== pw) {
      errors['passwordConfirmation'] = 'Las contraseñas no coinciden.';
    }

    if (payload.acceptTerms !== true) {
      errors['acceptTerms'] = 'Debés aceptar los términos y condiciones.';
    }

    return errors;
  }
}
