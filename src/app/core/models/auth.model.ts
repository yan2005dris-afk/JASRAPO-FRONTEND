export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    iat: string; // ISO 8601 date string
    exp: string; // ISO 8601 date string
    sub: number;
    sid: number;
}

export interface RefreshTokenResponse {
    accessToken: string;
    iat: string;
    exp: string;
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