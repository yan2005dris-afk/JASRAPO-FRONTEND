export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    createdAt: string; // ISO 8601 date string
    expiresAt: string; // ISO 8601 date string
    user: User;
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
    tokenCreatedAt: string | null;
    tokenExpiresAt: string | null;
}