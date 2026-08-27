export interface InvitationPreviewResponse {
  email: string;
  nombres: string;
  apellidos: string;
  expiresAt: string;
  isAccepted: boolean;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  password_confirmation: string;
  accept_terms: boolean;
  terms_version?: string;
}

export interface AcceptInvitationResponse {
  message: string;
  usuarioId: number;
  email: string;
}

export interface PendingInvitationItem {
  usuarioInvitacionId: number;
  usuarioId: number;
  email: string;
  nombres: string;
  apellidos: string;
  expiresAt: string;
  emailSentAt: string | null;
  emailFailedAt: string | null;
  emailAttempts: number;
  createdAt: string;
}

export interface ResendInvitationResponse {
  message: string;
  invitationId: number;
  expiresAt: string;
}
