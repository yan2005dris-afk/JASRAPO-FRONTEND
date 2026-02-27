# Aplicativo Web de Gestión de Agua (Frontend)

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 21.1.4.

## 📁 Estructura del Proyecto

El proyecto sigue una arquitectura orientada a características (Feature-driven architecture) optimizada para componentes Standalone.

```text
src/
└── app/
    ├── core/               # Singleton Services, Guards, Interceptors, Initializers
    ├── shared/             # UI Components, Directives, Pipes (Reutilizables)
    ├── data/               # Models, Types, Enums, API Mappers (DTOs)
    ├── layout/             # Navbar, Sidebar, Footer (Estructura principal de navegación)
    └── features/           # Módulos de la aplicación orientados a dominio (Lazy Loaded)
        ├── admin/          # Panel y vistas para el rol de administrador
        ├── auth/           # Rutas y componentes de autenticación y login
        ├── billing/        # Sistema de facturación, tarifas, cobros y formas de pago
        ├── dashboard/      # Panel de control principal y layouts
        ├── distribution/   # Gestión de red de distribución pública (válvulas, tuberías)
        ├── presidente/     # Vistas y componentes para el rol de presidente
        ├── reports/        # Generación de reportes y exportación de datos
        ├── secretario/     # Vistas y componentes para el rol de secretario
        ├── tesorero/       # Vistas y componentes para el rol de tesorero
        ├── users/          # Gestión de usuarios del sistema (operadores, clientes)
        └── water-sources/  # Gestión de fuentes de agua (pozos, ríos, embalses)
        
```

### Descripción de Directorios

- **Core (`src/app/core`)**: Contiene servicios esenciales que deben tener una única instancia (singletons) en toda la aplicación (ej. `AuthService`, `HttpInterceptor`).
- **Shared (`src/app/shared`)**: Contiene elementos visuales y lógicos compartidos en múltiples partes de la app, listos para ser importados por los Features (ej. botones, modales, tarjetas resumen).
- **Data (`src/app/data`)**: Encargado de definir los modelos de datos de la aplicación (Interfaces, Tipos, Enums) y mappers para las respuestas de la API.
- **Layout (`src/app/layout`)**: Almacena los elementos estructurales de la interfaz como la barra de navegación lateral (Sidebar), menú principal (Navbar) y pie de página (Footer).
- **Features (`src/app/features`)**: Divide la aplicación por dominios de negocio. Cada subcarpeta (ej. `billing`, `distribution`) contiene sus propios componentes, rutas, modelos y servicios específicos de esa funcionalidad, manteniendo el código altamente cohesivo y acoplado de forma débil al resto del sistema.

## 🚀 Servidor de Desarrollo

Para iniciar el servidor de desarrollo local, ejecuta:

```bash
ng serve
```
Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente al modificar los archivos fuente.

## 🔑 Credenciales de Prueba

El sistema está configurado con 4 usuarios de prueba para desarrollo (**sin backend**):

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | admin@japo.com | 123456 | Admin |
| Presidente | presidente@japo.com | 123456 | Presidente |
| Secretario | secretario@japo.com | 123456 | Secretario |
| Tesorero | tesorero@japo.com | 123456 | Tesorero |

**Funcionalidad clave:** El menú de navegación se carga dinámicamente según el rol del usuario, simulando el comportamiento que tendrá cuando se conecte con el backend real.

> **Nota:** Estas credenciales están hardcodeadas en el frontend para permitir el desarrollo de la UI sin depender del backend. Cuando el backend esté disponible, se debe modificar el método `login()` en `src/app/core/services/auth.service.ts`.

Para más información, consulta [CREDENCIALES_DEMO.md](CREDENCIALES_DEMO.md).
## 🔐 Sistema de Autenticación

El proyecto implementa un **sistema híbrido de autenticación** con dos tipos de tokens:

### Access Token (Header)
- Enviado en header `Authorization: Bearer {token}`
- Incluye fechas de creación y expiración
- Duración corta (15 minutos)
- Almacenado en localStorage
- Auto-refresh automático 2 minutos antes de expirar

### Refresh Token (Cookie HttpOnly)
- Enviado como cookie HttpOnly (no accesible desde JavaScript)
- Duración larga (7 días)
- Protección contra XSS
- Usado solo para renovar el access token

**Documentación completa**: [API_AUTH_HYBRID_DOCUMENTATION.md](API_AUTH_HYBRID_DOCUMENTATION.md)

**Características implementadas**:
- ✅ Login con credenciales
- ✅ Auto-refresh de tokens (sin intervención del usuario)
- ✅ Guards de rutas (`authGuard`, `guestGuard`)
- ✅ Interceptor HTTP que agrega token automáticamente
- ✅ Logout con limpieza de cookies
- ✅ Gestión de fechas de expiración
- ✅ Manejo de errores y redirección automática

**Archivos principales**:
- `src/app/core/models/auth.model.ts` - Interfaces TypeScript
- `src/app/core/services/auth.service.ts` - Lógica de autenticación
- `src/app/core/guards/auth.guard.ts` - Protección de rutas
- `src/app/core/interceptors/auth.interceptor.ts` - Inyección de tokens
## 🛠️ Generación de Código

Usa el Angular CLI para generar nuevos elementos. Por ejemplo, para crear un nuevo componente dentro de un feature:

```bash
ng generate component features/water-sources/components/source-list
```

Para ver la lista completa de esquemas (`components`, `directives`, `pipes`, etc.), ejecuta:

```bash
ng generate --help
```

## 🏗️ Construcción (Build)

Para compilar el proyecto para producción:

```bash
ng build
```
Los archivos de la compilación se guardarán en el directorio `dist/`. La compilación de producción optimiza la aplicación para rendimiento y velocidad.

## 🧪 Pruebas (Testing)

Ejecuta las pruebas unitarias usando:

```bash
ng test
```
Este proyecto utiliza [Vitest](https://vitest.dev/) para las pruebas unitarias.

## 📚 Recursos Adicionales

Para más información sobre el Angular CLI, incluyendo comandos de referencia, visita la [referencia oficial web del Angular CLI](https://angular.dev/tools/cli).
