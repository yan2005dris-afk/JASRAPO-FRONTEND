import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of, delay } from 'rxjs';
import { LoginRequest, LoginResponse, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private readonly API_URL = `${environment.apiUrl}/auth`;
    
    // Signals para el estado de autenticación
    private readonly tokenSignal = signal<string | null>(this.getStoredToken());
    private readonly userSignal = signal<User | null>(this.getStoredUser());
    
    // Estado público computed
    readonly isAuthenticated = computed(() => !!this.tokenSignal());
    readonly currentUser = computed(() => this.userSignal());
    readonly token = computed(() => this.tokenSignal());

    /**
     * Realiza el login del usuario
     * @param credentials Credenciales de acceso
     * @returns Observable con la respuesta del login
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        // ============================================
        // SIMULACIÓN DE BACKEND - SOLO PARA DESARROLLO
        // ============================================
        // Usuarios de prueba con diferentes roles
        const DEMO_USERS = [
            {
                email: 'admin@japo.com',
                password: '123456',
                userData: {
                    id: '1',
                    email: 'admin@japo.com',
                    name: 'Administrador JAPO',
                    role: 'Admin',
                    avatar: 'https://ui-avatars.com/api/?name=Admin+JAPO&background=0D6EFD&color=fff'
                }
            },
            {
                email: 'presidente@japo.com',
                password: '123456',
                userData: {
                    id: '2',
                    email: 'presidente@japo.com',
                    name: 'Carlos Mendoza',
                    role: 'Presidente',
                    avatar: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=198754&color=fff'
                }
            },
            {
                email: 'secretario@japo.com',
                password: '123456',
                userData: {
                    id: '3',
                    email: 'secretario@japo.com',
                    name: 'María González',
                    role: 'Secretario',
                    avatar: 'https://ui-avatars.com/api/?name=Maria+Gonzalez&background=FFC107&color=000'
                }
            },
            {
                email: 'tesorero@japo.com',
                password: '123456',
                userData: {
                    id: '4',
                    email: 'tesorero@japo.com',
                    name: 'Roberto Silva',
                    role: 'Tesorero',
                    avatar: 'https://ui-avatars.com/api/?name=Roberto+Silva&background=DC3545&color=fff'
                }
            }
        ];

        // Buscar usuario por email y password
        const foundUser = DEMO_USERS.find(
            user => user.email === credentials.email && user.password === credentials.password
        );

        if (foundUser) {
            // Simular respuesta exitosa del backend
            const mockResponse: LoginResponse = {
                token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(foundUser.userData))}.demo-signature`,
                refreshToken: 'refresh-token-demo',
                user: foundUser.userData
            };

            return of(mockResponse).pipe(
                delay(800), // Simula latencia de red
                tap(response => this.handleLoginSuccess(response))
            );
        } else {
            // Simular error de credenciales inválidas
            return throwError(() => new Error('Credenciales inválidas')).pipe(
                delay(800)
            );
        }

        // ============================================
        // CÓDIGO REAL PARA BACKEND
        // Descomentar cuando el backend esté listo
        // ============================================
        // return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
        //     .pipe(
        //         tap(response => this.handleLoginSuccess(response)),
        //         catchError(error => this.handleError(error))
        //     );
    }

    /**
     * Cierra la sesión del usuario
     */
    logout(): void {
        // TODO: Si hay endpoint de logout en el backend, llamarlo aquí
        // this.http.post(`${this.API_URL}/logout`, {}).subscribe();
        
        this.clearAuthData();
        this.router.navigate(['/login']);
    }

    /**
     * Refresca el token de autenticación
     * @returns Observable con el nuevo token
     */
    refreshToken(): Observable<LoginResponse> {
        const refreshToken = this.getStoredRefreshToken();
        
        return this.http.post<LoginResponse>(`${this.API_URL}/refresh`, { refreshToken })
            .pipe(
                tap(response => this.handleLoginSuccess(response)),
                catchError(error => {
                    this.logout();
                    return throwError(() => error);
                })
            );
    }

    /**
     * Maneja la respuesta exitosa del login
     */
    private handleLoginSuccess(response: LoginResponse): void {
        this.tokenSignal.set(response.token);
        this.userSignal.set(response.user);
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
        }
    }

    /**
     * Limpia los datos de autenticación
     */
    private clearAuthData(): void {
        this.tokenSignal.set(null);
        this.userSignal.set(null);
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
    }

    /**
     * Obtiene el token almacenado
     */
    private getStoredToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    /**
     * Obtiene el usuario almacenado
     */
    private getStoredUser(): User | null {
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            return userJson ? JSON.parse(userJson) : null;
        }
        return null;
    }

    /**
     * Obtiene el refresh token almacenado
     */
    private getStoredRefreshToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('refreshToken');
        }
        return null;
    }

    /**
     * Maneja errores de las peticiones
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en autenticación:', error);
        
        let errorMessage = 'Ocurrió un error en el servidor';
        
        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.status === 401) {
            errorMessage = 'Credenciales inválidas';
        } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
        }
        
        return throwError(() => new Error(errorMessage));
    }
}
