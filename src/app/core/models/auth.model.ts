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
    avatar?: string;
    createdAt: string; // ISO 8601 date string
    expiresAt: string; // ISO 8601 date string
}

export interface RefreshTokenResponse {
    token: string;
    createdAt: string;
    expiresAt: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    roleId: number;        // ID numérico del rol
    roleName?: string;     // Nombre del rol (opcional, para display)
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