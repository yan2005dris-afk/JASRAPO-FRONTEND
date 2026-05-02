export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  sid: string;
  sub: string; // User ID
  email: string;
  name: string;
  roleId: number;
  roleName?: string;
  avatar?: string;
  iat?: string | number;
  exp?: string | number;
  createdAt?: string; // ISO 8601 date string
  expiresAt?: string; // ISO 8601 date string
}

export interface RefreshTokenResponse {
  accessToken: string;
  createdAt: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  roleId: number; // ID numérico del rol
  roleName?: string; // Nombre del rol (opcional, para display)
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  sid: string | null;
  tokenCreatedAt: string | null;
  tokenExpiresAt: string | null;
}
