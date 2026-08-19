# API de Autenticación - Documentación

## Esqueleto de APIs Implementado

### Archivos Creados

#### 1. **Modelos** (`src/app/core/models/auth.model.ts`)

Define las interfaces TypeScript para las peticiones y respuestas de autenticación:

```typescript
LoginRequest; // Credenciales de login
LoginResponse; // Respuesta del servidor con token y usuario
User; // Información del usuario
AuthState; // Estado de autenticación
```

#### 2. **Servicio de Autenticación** (`src/app/core/services/auth.service.ts`)

Servicio principal que maneja toda la lógica de autenticación:

**Métodos públicos:**

- `login(credentials: LoginRequest)` - Inicia sesión
- `logout()` - Cierra sesión
- `refreshToken()` - Refresca el token

**Signals públicos:**

- `isAuthenticated()` - Estado de autenticación
- `currentUser()` - Usuario actual
- `token()` - Token actual

**Características:**

- Almacena token y usuario en localStorage
- Manejo de errores centralizado
- Soporte para refresh token
- Signals para estado reactivo

#### 3. **Guards** (`src/app/core/guards/auth.guard.ts`)

Protege las rutas de la aplicación:

- `authGuard` - Requiere autenticación (rutas protegidas)
- `guestGuard` - Solo para no autenticados (ej: login)

#### 4. **Interceptor** (`src/app/core/interceptors/auth.interceptor.ts`)

Agrega automáticamente el token a todas las peticiones HTTP:

```
Authorization: Bearer {token}
```

#### 5. **Environment** (`src/environments/`)

Configuración de URLs del API:

- `environment.development.ts` - Desarrollo (localhost:3000)
- `environment.ts` - Producción

---

## Cómo Conectar con el Backend

### 1. Configurar la URL del API

Edita `src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://tu-servidor:puerto/api', // ← Cambia esto
  apiTimeout: 30000,
};
```

### 2. Endpoints Esperados por el Frontend

El backend debe implementar estos endpoints:

#### **POST /api/auth/login**

**Request:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "optional-refresh-token",
  "user": {
    "id": "123",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "Administrador",
    "avatar": "https://..."
  }
}
```

**Response (401 Unauthorized):**

```json
{
  "message": "Credenciales inválidas"
}
```

#### **POST /api/auth/refresh** (Opcional)

**Request:**

```json
{
  "refreshToken": "refresh-token-aqui"
}
```

**Response:**

```json
{
    "token": "nuevo-token",
    "user": { ... }
}
```

#### **POST /api/auth/logout** (Opcional)

Puedes descomentar la línea en `auth.service.ts`:

```typescript
this.http.post(`${this.API_URL}/logout`, {}).subscribe();
```

---

## Uso del Servicio en Componentes

### Inyectar el servicio:

```typescript
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

export class MiComponente {
  private readonly authService = inject(AuthService);
}
```

### Verificar autenticación:

```typescript
if (this.authService.isAuthenticated()) {
  // Usuario autenticado
}
```

### Obtener usuario actual:

```typescript
const user = this.authService.currentUser();
console.log(user?.name, user?.role);
```

### Obtener token:

```typescript
const token = this.authService.token();
```

### Cerrar sesión:

```typescript
this.authService.logout();
```

---

## Simulación sin Backend (Desarrollo)

Para probar sin backend, puedes modificar temporalmente `auth.service.ts`:

```typescript
login(credentials: LoginRequest): Observable<LoginResponse> {
    // SIMULACIÓN - Eliminar cuando esté el backend
    return of({
        token: 'fake-jwt-token',
        user: {
            id: '1',
            email: credentials.email,
            name: 'Usuario Demo',
            role: 'Administrador'
        }
    }).pipe(
        delay(1000), // Simula latencia
        tap(response => this.handleLoginSuccess(response))
    );

    // CÓDIGO REAL - Descomentar cuando esté el backend
    // return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
    //     .pipe(
    //         tap(response => this.handleLoginSuccess(response)),
    //         catchError(error => this.handleError(error))
    //     );
}
```

No olvides importar:

```typescript
import { of, delay } from 'rxjs';
```

---

## Manejo de Errores

Los errores del backend se manejan automáticamente en `auth.service.ts`:

```typescript
private handleError(error: any): Observable<never> {
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
```

Los errores se muestran automáticamente en el componente de login.

---

## Estado de la UI

El componente de login maneja 3 estados:

1. **Normal** - Formulario listo
2. **Loading** - Botón deshabilitado, spinner visible
3. **Error** - Alerta roja con mensaje

```typescript
loading = signal(false); // Estado de carga
errorMessage = signal<string | null>(null); // Mensaje de error
```

---

## Protección de Rutas

Las rutas están protegidas en `app.routes.ts`:

```typescript
{
    path: 'app',
    canActivate: [authGuard],  // Solo usuarios autenticados
    children: [...]
}

{
    path: 'login',
    canActivate: [guestGuard]  // Solo usuarios NO autenticados
}
```

---

## Flujo de Autenticación

1. Usuario ingresa credenciales en `/login`
2. Click en "Iniciar Sesión"
3. `LoginComponent` llama a `authService.login()`
4. `AuthService` envía POST a `/api/auth/login`
5. Backend valida y retorna token + usuario
6. `AuthService` guarda en localStorage y actualiza signals
7. `authInterceptor` agregará el token a futuras peticiones
8. Usuario es redirigido a `/app/dashboard`
9. `authGuard` permite el acceso porque el usuario está autenticado

---

## Próximos Pasos

1. **Backend:** Implementar los endpoints mencionados
2. **CORS:** Configurar CORS en el backend para aceptar peticiones del frontend
3. **HTTPS:** En producción, usar HTTPS tanto en frontend como backend
4. **Refresh Token:** Implementar lógica de renovación automática del token
5. **Persistencia:** Considerar usar cookies HttpOnly en lugar de localStorage para mayor seguridad
6. **Testing:** Agregar tests unitarios para el AuthService

---

## Seguridad

⚠️ **Importante:**

- Los tokens se almacenan en `localStorage` (vulnerable a XSS)
- En producción, considera usar cookies HttpOnly
- Implementa CSRF protection si usas cookies
- Usa HTTPS siempre en producción
- Implementa rate limiting en el backend

---

## Troubleshooting

### Error: "No se pudo conectar con el servidor"

- Verifica que el backend esté corriendo
- Revisa la URL en `environment.development.ts`
- Verifica CORS en el backend

### Error: "Credenciales inválidas"

- El backend rechazó el login
- Verifica usuario/contraseña

### El token no se envía en las peticiones

- Verifica que `authInterceptor` esté en `app.config.ts`
- Verifica que `provideHttpClient()` esté configurado

### El usuario sigue autenticado después de cerrar sesión

- Verifica que `logout()` limpie localStorage
- Verifica que los signals se actualicen correctamente
