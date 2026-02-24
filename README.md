# Aplicativo Web de Gestión de Agua (Frontend)

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 21.1.4.

## 📁 Estructura del Proyecto

El proyecto sigue una arquitectura orientada a características (Feature-driven architecture) optimizada para componentes Standalone.

```text
src/
└── app/
    ├── core/               # Lógica singleton, servicios base, guards, interceptors
    ├── shared/             # Componentes reutilizables, directivas, pipes comunes
    └── features/           # Módulos de la aplicación orientados a dominio
        ├── dashboard/      # Panel de control principal y estadísticas
        ├── water-sources/  # Gestión de fuentes de agua (pozos, ríos, embalses)
        ├── distribution/   # Gestión de red de distribución pública (válvulas, tuberías, medidores)
        ├── billing/        # Sistema de facturación, tarifas y gestión de cobros
        ├── users/          # Gestión de usuarios del sistema (operadores, clientes, admins)
        └── reports/        # Generación de reportes y exportación de datos
```

### Descripción de Directorios

- **Core (`src/app/core`)**: Contiene servicios esenciales que deben tener una única instancia (singletons) en toda la aplicación (ej. `AuthService`, `HttpInterceptor`, layout layout principal).
- **Shared (`src/app/shared`)**: Contiene elementos visuales y lógicos compartidos en múltiples partes de la app, listos para ser importados por los Features (ej. botones, modales, tarjetas resumen).
- **Features (`src/app/features`)**: Divide la aplicación por dominios de negocio. Cada subcarpeta (ej. `billing`, `distribution`) contiene sus propios componentes, rutas, modelos y servicios específicos de esa funcionalidad, manteniendo el código altamente cohesivo y acoplado de forma débil al resto del sistema.

## 🚀 Servidor de Desarrollo

Para iniciar el servidor de desarrollo local, ejecuta:

```bash
ng serve
```
Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente al modificar los archivos fuente.

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
