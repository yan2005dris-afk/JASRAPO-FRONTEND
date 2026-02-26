# 🔐 Credenciales de Prueba

## Simulación de Login (Frontend Only)

Mientras no esté conectado el backend, puedes usar estas credenciales para iniciar sesión:

### 👨‍💼 Usuarios Demo

#### 1. Administrador (Acceso Total)
```
Email:      admin@japo.com
Contraseña: 123456
Rol:        Admin
```
**Permisos:** Acceso a todas las secciones del sistema

#### 2. Presidente
```
Email:      presidente@japo.com
Contraseña: 123456
Rol:        Presidente
```
**Permisos:** Dashboard, Presidencia (Aprobaciones, Reportes Ejecutivos, Actas), Reportes

#### 3. Secretario
```
Email:      secretario@japo.com
Contraseña: 123456
Rol:        Secretario
```
**Permisos:** Dashboard, Secretaría (Documentos, Correspondencia, Archivo), Fuentes de Agua

#### 4. Tesorero
```
Email:      tesorero@japo.com
Contraseña: 123456
Rol:        Tesorero
```
**Permisos:** Dashboard, Tesorería (Ingresos, Egresos, Balance), Facturación, Reportes

---

## 📋 Menú Dinámico por Rol

El sistema carga el menú de navegación de forma dinámica según el rol del usuario autenticado:

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

El servicio de menú (`menu.service.ts`) está configurado para:

1. ✅ Leer el rol del usuario autenticado
2. ✅ Filtrar los items del menú según los permisos del rol
3. ✅ Mostrar solo las opciones permitidas en el sidebar
4. ✅ Simular la respuesta que vendría del backend

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
return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
    .pipe(
        tap(response => this.handleLoginSuccess(response)),
        catchError(error => this.handleError(error))
    );
```

### 2. Actualizar MenuService

El backend debe retornar la configuración del menú en formato:

```json
{
    "menuItems": [
        {
            "id": "dashboard",
            "label": "Dashboard",
            "icon": "bi-speedometer2",
            "route": "/app/dashboard",
            "roles": ["Admin", "Presidente", "Secretario", "Tesorero"],
            "children": []
        },
        {
            "id": "admin",
            "label": "Administración",
            "icon": "bi-gear-fill",
            "roles": ["Admin"],
            "children": [
                {
                    "id": "admin-users",
                    "label": "Gestión de Usuarios",
                    "route": "/app/admin/users",
                    "roles": ["Admin"]
                }
            ]
        }
    ]
}
```

Modifica `menu.service.ts` para obtener el menú desde el backend:

```typescript
getMenuFromBackend(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/menu`)
        .pipe(
            tap(menu => console.log('Menú cargado:', menu))
        );
}
```

---

## ⚠️ Importante

- ❌ No usar estas credenciales en producción
- ❌ Los tokens generados son falsos
- ✅ Solo para desarrollo y pruebas de UI/UX
- ✅ El menú se filtra en el frontend pero debe validarse en backend
- ✅ Eliminar este archivo antes de producción
