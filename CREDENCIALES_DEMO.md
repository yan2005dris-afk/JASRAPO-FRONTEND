# 🔐 Credenciales de Prueba

## Simulación de Login (Frontend Only)

Mientras no esté conectado el backend, puedes usar estas credenciales para iniciar sesión:

### 👨‍💼 Usuarios Demo

| Usuario | Email | Contraseña | roleId | roleName |
|---------|-------|------------|--------|----------|
| Administrador | admin@japo.com | 123456 | **1** | Admin |
| Presidente | presidente@japo.com | 123456 | **2** | Presidente |
| Secretario | secretario@japo.com | 123456 | **3** | Secretario |
| Tesorero | tesorero@japo.com | 123456 | **4** | Tesorero |

#### 1. Administrador (Acceso Total)
```
Email:      admin@japo.com
Contraseña: 123456
roleId:     1
roleName:   Admin
```
**Permisos:** Acceso a todas las secciones del sistema

#### 2. Presidente
```
Email:      presidente@japo.com
Contraseña: 123456
roleId:     2
roleName:   Presidente
```
**Permisos:** Dashboard, Presidencia (Aprobaciones, Reportes Ejecutivos, Actas), Reportes

#### 3. Secretario
```
Email:      secretario@japo.com
Contraseña: 123456
roleId:     3
roleName:   Secretario
```
**Permisos:** Dashboard, Secretaría (Documentos, Correspondencia, Archivo), Fuentes de Agua

#### 4. Tesorero
```
Email:      tesorero@japo.com
Contraseña: 123456
roleId:     4
roleName:   Tesorero
```
**Permisos:** Dashboard, Tesorería (Ingresos, Egresos, Balance), Facturación, Reportes

---

## 📋 Menú Dinámico por Rol

**⚠️ Importante:** El backend envía el menú **ya filtrado** según el `roleId` del usuario. El frontend NO filtra el menú, solo muestra lo que recibe.

### Estructura del Menú (Backend)

Cada item del menú tiene esta estructura desde la base de datos:

```typescript
{
    id: number;                // ID numérico de la BD
    name: string;              // Nombre a mostrar
    route?: string;            // Ruta de navegación
    icon?: string;             // Icono Bootstrap
    parent_menu_id?: number;   // ID del menú padre (para jerarquía)
    menu_order: number;        // Orden de visualización
    is_active: boolean;        // Estado activo
    created_at?: string;       // Timestamp
    children?: MenuItem[];     // Submenús anidados
}
```

### Menús por Rol

El sistema carga el menú de navegación desde `GET /api/menu` y muestra solo lo que el backend envía:

### Admin
- ✅ Dashboard
- ✅ Administración (Usuarios, Roles, Configuración)
- ✅ Presidencia (Aprobaciones, Reportes, Actas)
- ✅ Secretaría (Documentos, Correspondencia, Archivo)
- ✅ Tesorería (Ingresos, Egresos, Balance)
- ✅ Fuentes de Agua
- ✅ Facturación
- ✅ Reportes

### Presidente
- ✅ Dashboard
- ✅ Presidencia (Aprobaciones, Reportes, Actas)
- ✅ Reportes

### Secretario
- ✅ Dashboard
- ✅ Secretaría (Documentos, Correspondencia, Archivo)
- ✅ Fuentes de Agua

### Tesorero
- ✅ Dashboard
- ✅ Tesorería (Ingresos, Egresos, Balance)
- ✅ Facturación
- ✅ Reportes

---

## ⚙️ Cómo Funciona

### Flujo de Carga del Menú

1. ✅ Usuario inicia sesión con credenciales
2. ✅ Backend valida y envía respuesta con `user.roleId`
3. ✅ Frontend guarda token y datos de usuario en localStorage
4. ✅ `MainLayout` detecta usuario autenticado y llama `getMenuFromBackend()`
5. ✅ Backend recibe petición GET `/api/menu` con JWT en header
6. ✅ Backend extrae `roleId` del token JWT
7. ✅ Backend consulta BD y filtra menús por `roleId`
8. ✅ Backend construye jerarquía (items con children)
9. ✅ Backend envía array de menús filtrados
10. ✅ Frontend muestra menú tal cual lo recibió (sin filtrar)

### Responsabilidades

**Backend:**
- Validar JWT y extraer `roleId`
- Consultar tabla `menus` y `role_menus`
- Filtrar solo menús permitidos para ese `roleId`
- Ordenar por `menu_order`
- Construir jerarquía parent-child
- Retornar solo items con `is_active: true`

**Frontend:**
- Llamar `GET /api/menu` con header `Authorization`
- Recibir y mostrar menú sin modificaciones
- Manejar expansión/colapso de menús con hijos
- Limpiar menú al hacer logout

---

## 🔄 Cambiar a Backend Real

Cuando el backend esté listo:

### 1. Actualizar AuthService

Abre `src/app/core/services/auth.service.ts` y:
- Comenta el bloque de **SIMULACIÓN DE BACKEND**
- Descomenta el bloque de **CÓDIGO REAL PARA BACKEND**

```typescript
// Comentar esto:
// const DEMO_USERS = [...]

// Descomentar esto:
return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials, {
    withCredentials: true  // IMPORTANTE: para recibir cookie del refresh token
})
```

### 2. Actualizar MenuService

Abre `src/app/core/services/menu.service.ts` y:
- Comenta el bloque de **SIMULACIÓN - SOLO PARA DESARROLLO**
- Descomenta el bloque de **CÓDIGO REAL PARA BACKEND**

```typescript
// Comentar esto:
// const menusByRole: Record<number, MenuItem[]> = { ... }

// Descomentar esto:
return this.http.get<MenuItem[]>(
    `${this.API_URL}`,
    { withCredentials: true }
).pipe(
    tap(menu => this.menuItemsSignal.set(menu))
);
```

### 3. Implementar Endpoints en Backend

El backend debe implementar:

#### POST /api/auth/login
- Valida credenciales
- Genera access token (JWT) con `roleId` en payload
- Genera refresh token y lo envía como cookie HttpOnly
- Retorna: `{ token, createdAt, expiresAt, user: { id, email, name, roleId, roleName } }`

#### POST /api/auth/refresh  
- Lee refresh token de la cookie
- Genera nuevo access token
- Retorna: `{ token, createdAt, expiresAt }`

#### POST /api/auth/logout
- Limpia cookie del refresh token
- Retorna: `{ message: "Sesión cerrada" }`

#### GET /api/menu
- Extrae `roleId` del JWT
- Consulta menús permitidos para ese rol
- Construye jerarquía (items con children)
- Retorna: array de `MenuItem[]` filtrado

### 4. Estructura de la Base de Datos

```sql
-- Tabla de menús
CREATE TABLE menus (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    route VARCHAR,
    icon VARCHAR,
    parent_menu_id INTEGER,
    menu_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_menu_id) REFERENCES menus(id)
);

-- Tabla de relación rol-menú
CREATE TABLE role_menus (
    role_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, menu_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
);
```

---

## ⚠️ Importante

- ❌ No usar estas credenciales en producción
- ❌ Los tokens generados son falsos
- ✅ Solo para desarrollo y pruebas de UI/UX
- ✅ El menú se filtra en el frontend pero debe validarse en backend
- ✅ Eliminar este archivo antes de producción
