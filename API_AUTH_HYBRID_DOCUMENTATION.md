# API de Autenticación - Sistema Híbrido

## 🔐 Arquitectura de Autenticación

El sistema implementa una **arquitectura híbrida de tokens** para máxima seguridad:

### Access Token (Header)

- **Ubicación**: Header `Authorization: Bearer {token}`
- **Almacenamiento**: localStorage
- **Duración**: Corta (15 minutos recomendado)
- **Uso**: Autorizar todas las peticiones HTTP
- **Incluye**:
  - `token`: JWT string
  - `createdAt`: Fecha ISO 8601 de creación
  - `expiresAt`: Fecha ISO 8601 de expiración

### Refresh Token (Cookie HttpOnly)

- **Ubicación**: Cookie `refreshToken`
- **Almacenamiento**: Cookie HttpOnly (inaccesible desde JS)
- **Duración**: Larga (7 días recomendado)
- **Uso**: Obtener un nuevo access token cuando expire
- **Seguridad**: Protegido contra XSS, requiere CSRF protection

---

## 📋 Modelos de Datos

### LoginRequest

```typescript
{
  email: string;
  password: string;
}
```

### LoginResponse

```typescript
{
    token: string;           // Access token JWT
    createdAt: string;       // ISO 8601 timestamp
    expiresAt: string;       // ISO 8601 timestamp
    user: {
        id: string;
        email: string;
        name: string;
        roleId: number;      // 1=Admin, 2=Presidente, 3=Secretario, 4=Tesorero
        roleName?: string;   // Nombre del rol para mostrar en UI (opcional)
        avatar?: string;
    }
}
```

**Nota**: El refresh token NO viene en el body, viene como cookie `Set-Cookie`.

### MenuItem (Estructura del Backend)

```typescript
{
    id: number;                // ID del menú en la base de datos
    name: string;              // Nombre del menú (NOT NULL)
    route?: string;            // Ruta de navegación (nullable)
    icon?: string;             // Icono del menú (nullable)
    parent_menu_id?: number;   // ID del menú padre (nullable, para jerarquía)
    menu_order: number;        // Orden de visualización
    is_active: boolean;        // Estado activo/inactivo
    created_at?: string;       // Fecha de creación (timestamp)
    children?: MenuItem[];     // Submenús (calculado)
}
```

**Nota importante**: El backend debe enviar el menú **ya filtrado** según el `roleId` del usuario autenticado.

### RefreshTokenResponse

```typescript
{
  token: string; // Nuevo access token
  createdAt: string; // ISO 8601 timestamp
  expiresAt: string; // ISO 8601 timestamp
}
```

---

## 🌐 Endpoints del Backend

### POST /api/auth/login

**Request Body**:

```json
{
  "email": "admin@japo.com",
  "password": "123456"
}
```

**Response Headers**:

```
Set-Cookie: refreshToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Response Body** (200 OK):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2026-02-25T10:30:00.000Z",
  "expiresAt": "2026-02-25T10:45:00.000Z",
  "user": {
    "id": "1",
    "email": "admin@japo.com",
    "name": "Administrador JAPO",
    "roleId": 1,
    "roleName": "Admin",
    "avatar": "https://..."
  }
}
```

**Response** (401 Unauthorized):

```json
{
  "message": "Credenciales inválidas"
}
```

---

### POST /api/auth/refresh

**Request**: Vacío (el refresh token se envía automáticamente como cookie)

**Request Headers**:

```
Cookie: refreshToken=eyJhbG...
```

**Response Headers**:

```
Set-Cookie: refreshToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Response Body** (200 OK):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2026-02-25T10:45:00.000Z",
  "expiresAt": "2026-02-25T11:00:00.000Z"
}
```

**Response** (401 Unauthorized):

```json
{
  "message": "Refresh token inválido o expirado"
}
```

---

### POST /api/auth/logout

**Request**: Vacío

**Response Headers**:

```
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

**Response Body** (200 OK):

```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### GET /api/menu

**Descripción**: Obtiene el menú de navegación **pre-filtrado** según el rol del usuario autenticado.

**Authentication**: Requiere header `Authorization: Bearer {token}`

**Request Headers**:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Body** (200 OK):

```json
[
  {
    "id": 1,
    "name": "Dashboard",
    "icon": "bi-speedometer2",
    "route": "/app/dashboard",
    "menu_order": 1,
    "is_active": true
  },
  {
    "id": 2,
    "name": "Administración",
    "icon": "bi-gear-fill",
    "menu_order": 2,
    "is_active": true,
    "children": [
      {
        "id": 21,
        "name": "Gestión de Usuarios",
        "route": "/app/admin/users",
        "parent_menu_id": 2,
        "menu_order": 1,
        "is_active": true
      },
      {
        "id": 22,
        "name": "Roles y Permisos",
        "route": "/app/admin/roles",
        "parent_menu_id": 2,
        "menu_order": 2,
        "is_active": true
      }
    ]
  }
]
```

**Response** (401 Unauthorized):

```json
{
  "message": "Token inválido o expirado"
}
```

**Notas importantes**:

- El backend debe filtrar el menú según el `roleId` del usuario extraído del JWT
- El array `children` debe estar anidado correctamente
- Solo retornar ítems con `is_active: true`
- Ordenar por `menu_order` ascendente
- El frontend NO filtra el menú, confía en lo que envía el backend

---

## ⚙️ Configuración del Backend

### 1. CORS (IMPORTANTE)

```javascript
// Express.js ejemplo
const cors = require('cors');

app.use(
  cors({
    origin: 'http://localhost:4200', // URL del frontend
    credentials: true, // ¡MUY IMPORTANTE!
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
```

### 2. Cookies en Login/Refresh

```javascript
// Express.js - Login
app.post('/api/auth/login', async (req, res) => {
  // Validar credenciales...

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Enviar refresh token como cookie HttpOnly
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // No accesible desde JavaScript
    secure: true, // Solo HTTPS en producción
    sameSite: 'strict', // Protección CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });

  // Enviar access token en el body
  res.json({
    token: accessToken,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId, // 1, 2, 3, o 4
      roleName: user.roleName, // "Admin", "Presidente", etc.
    },
  });
});
```

### 3. Refresh Token Endpoint

```javascript
// Express.js - Refresh
app.post('/api/auth/refresh', (req, res) => {
  // Leer refresh token de la cookie
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  // Verificar el refresh token
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Generar nuevo access token
    const newAccessToken = generateAccessToken(decoded.user);

    // Opcionalmente, rotar el refresh token
    const newRefreshToken = generateRefreshToken(decoded.user);
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: newAccessToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    res.status(401).json({ message: 'Refresh token inválido' });
  }
});
```

### 4. Logout

```javascript
// Express.js - Logout
app.post('/api/auth/logout', (req, res) => {
  // Limpiar la cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0, // Expira inmediatamente
  });

  res.json({ message: 'Sesión cerrada exitosamente' });
});
```

---

## 🔄 Flujo de Autenticación

### Login Inicial

1. Usuario ingresa credenciales en `/login`
2. Frontend: `POST /api/auth/login` con `withCredentials: true`
3. Backend valida y genera:
   - Access token (15 min)
   - Refresh token (7 días)
4. Backend responde:
   - Cookie: `Set-Cookie: refreshToken=...`
   - Body: `{ token, createdAt, expiresAt, user }`
5. Frontend guarda en localStorage:
   - `token`
   - `tokenCreatedAt`
   - `tokenExpiresAt`
   - `user`
6. Frontend inicia timer para auto-refresh (13 minutos)
7. Redirección a `/app/dashboard`

### Peticiones Autenticadas

1. Usuario navega/hace peticiones
2. `authInterceptor` agrega automáticamente:
   - Header: `Authorization: Bearer {token}`
   - Config: `withCredentials: true`
3. Backend recibe:
   - Access token en header (valida con JWT)
   - Refresh token en cookie (no se usa aún)
4. Backend autoriza y responde

### Auto-Refresh del Token

1. Timer detecta que el token expira en 2 minutos
2. Frontend: `POST /api/auth/refresh` automáticamente
3. Navegador envía cookie `refreshToken` automáticamente
4. Backend valida refresh token de la cookie
5. Backend genera nuevo access token
6. Backend responde: `{ token, createdAt, expiresAt }`
7. Frontend actualiza localStorage
8. Frontend reinicia el timer para el próximo refresh
9. **El usuario no nota nada, sesión continua sin interrupciones**

### Logout

1. Usuario hace clic en "Cerrar Sesión"
2. Frontend: `POST /api/auth/logout` con `withCredentials: true`
3. Backend limpia cookie: `Set-Cookie: refreshToken=; Max-Age=0`
4. Frontend limpia localStorage
5. Frontend cancela timer de auto-refresh
6. Redirección a `/login`

---

## 💻 Uso en el Frontend

### Verificar Autenticación

```typescript
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

export class MiComponente {
  private readonly authService = inject(AuthService);

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      console.log('Usuario autenticado');
      console.log('Usuario:', this.authService.currentUser());
      console.log('Token expira:', this.authService.tokenExpiresAt());
    }
  }
}
```

### Forzar Refresh Manual

```typescript
refreshToken() {
    this.authService.refreshToken().subscribe({
        next: () => console.log('Token refrescado'),
        error: (err) => console.error('Error al refrescar:', err)
    });
}
```

### Cerrar Sesión

```typescript
logout() {
    this.authService.logout();
    // Automáticamente redirige a /login
}
```

---

## 🛡️ Seguridad

### ✅ Protecciones Implementadas

- **XSS Protection**: Refresh token en HttpOnly cookie (no accesible desde JS)
- **CSRF Protection**: `SameSite=Strict` o implementar tokens CSRF
- **Token Rotation**: Refresh token puede rotarse en cada uso
- **Short-lived Access Token**: Minimiza ventana de ataque si es robado
- **Auto-refresh**: Usuario nunca ve sesión expirada durante uso activo
- **HTTPS Required**: Flag `secure: true` en cookies en producción

### ⚠️ Mejores Prácticas

1. **HTTPS en Producción**: SIEMPRE usar HTTPS con `secure: true`
2. **SameSite**: Usar `strict` o `lax` según necesidades
3. **Token Expiration**:
   - Access token: 15-30 minutos
   - Refresh token: 7-30 días
4. **Refresh Timing**: Auto-refresh 2 minutos antes de expiración
5. **Error Handling**: Si refresh falla, hacer logout automático
6. **CORS**: Configurar correctamente con `credentials: true`

---

## 🐛 Troubleshooting

### La cookie del refresh token no se recibe

**Posibles causas**:

- ❌ CORS sin `credentials: true` en el backend
- ❌ Frontend no envía `withCredentials: true`
- ❌ Dominio/puerto diferente sin configurar `domain` en cookie
- ❌ Backend no envía `Set-Cookie` en la respuesta

**Solución**:

```javascript
// Backend
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
res.cookie('refreshToken', token, { httpOnly: true, ... });

// Frontend (ya está configurado en authInterceptor)
// { withCredentials: true }
```

### El access token no se envía en las peticiones

**Posibles causas**:

- ❌ Token no está en localStorage
- ❌ authInterceptor no está configurado
- ❌ Nombre de la key incorrecta en localStorage

**Verificar**:

- DevTools > Application > Local Storage > `token`
- DevTools > Network > Request Headers > `Authorization: Bearer ...`

### Auto-refresh no funciona

**Posibles causas**:

- ❌ Timer no se inició correctamente
- ❌ Endpoint `/refresh` no implementado
- ❌ Cookie del refresh token expiró

**Verificar logs**:

```typescript
// En la consola deberías ver:
Token refrescado automáticamente
```

### Error CORS en refresh

**Solución**:

```javascript
// Backend debe permitir:
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Credentials: true
```

### Usuario se desloguea al recargar página

**Causa**: localStorage se limpia o no se lee correctamente

**Verificar**:

- `getStoredToken()` se llama en el constructor
- localStorage tiene: `token`, `tokenCreatedAt`, `tokenExpiresAt`, `user`

---

## 📝 Checklist de Implementación Backend

### Autenticación

- [ ] Configurar CORS con `credentials: true`
- [ ] Endpoint `POST /auth/login` con cookie `Set-Cookie`
- [ ] Endpoint `POST /auth/refresh` que lee cookie y genera nuevo token
- [ ] Endpoint `POST /auth/logout` que limpia cookie
- [ ] Middleware de verificación de JWT en header `Authorization`
- [ ] Generación de tokens con fechas `createdAt` y `expiresAt`
- [ ] Cookies con flags: `httpOnly`, `secure`, `sameSite`
- [ ] Manejo de errores 401 para tokens inválidos/expirados
- [ ] Rate limiting en endpoints de autenticación
- [ ] Logging de intentos de login y refresh

### Sistema de Roles y Menú

- [ ] Base de datos con tabla `menus` (id, name, route, icon, parent_menu_id, menu_order, is_active, created_at)
- [ ] Tabla de relación `role_menus` (role_id, menu_id) para asignar menús a roles
- [ ] Endpoint `GET /api/menu` que retorna menú filtrado por roleId del usuario
- [ ] Lógica de filtrado por roleId extraído del JWT
- [ ] Construcción jerárquica de menú (items con children anidados)
- [ ] Ordenamiento por `menu_order`
- [ ] Filtrado por `is_active: true`
- [ ] User model con campos `roleId` (number) y `roleName` (string opcional)

---

## 📊 Ejemplo de Respuestas Completas

### Login Exitoso

**Request**:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@japo.com","password":"123456"}' \
  --cookie-jar cookies.txt
```

**Response**:

```
HTTP/1.1 200 OK
Set-Cookie: refreshToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2026-02-25T10:30:00.000Z",
  "expiresAt": "2026-02-25T10:45:00.000Z",
  "user": {
    "id": "1",
    "email": "admin@japo.com",
    "name": "Administrador JAPO",
    "roleId": 1,
    "roleName": "Admin"
  }
}
```

### Refresh Exitoso

**Request**:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  --cookie cookies.txt
```

**Response**:

```
HTTP/1.1 200 OK
Set-Cookie: refreshToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2026-02-25T10:45:00.000Z",
  "expiresAt": "2026-02-25T11:00:00.000Z"
}
```

---

## 🎯 Resumen

| Característica              | Access Token           | Refresh Token              |
| --------------------------- | ---------------------- | -------------------------- |
| **Transporte**              | Header `Authorization` | Cookie HttpOnly            |
| **Duración**                | Corta (15 min)         | Larga (7 días)             |
| **Almacenamiento Frontend** | localStorage           | No (cookie automática)     |
| **Accesible desde JS**      | Sí                     | No                         |
| **Uso**                     | Autorizar peticiones   | Obtener nuevo access token |
| **Seguridad**               | Vulnerable a XSS       | Protegido contra XSS       |
| **Auto-refresh**            | Sí (2 min antes)       | Rotación opcional          |

---

## 📚 Referencias

- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 6265 - HTTP State Management (Cookies)](https://tools.ietf.org/html/rfc6265)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
