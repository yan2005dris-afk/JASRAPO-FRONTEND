# Estandares y Convenciones del Frontend - JASRAPO

Este documento define las reglas de codificacion, convenciones de nomenclatura y mejores practicas para el desarrollo en JASRAPO-FRONTEND. Su objetivo es garantizar la consistencia, legibilidad y facilidad de mantenimiento del codigo.

---

## 1. Idioma y Traducciones

Para alinearnos con el Backend y la Base de Datos, seguimos la siguiente matriz de idiomas:

| Contexto | Idioma | Ejemplos |
| :--- | :--- | :--- |
| **Codigo** (Nombres de clases, metodos, variables, servicios, CSS) | **Ingles** | `TariffService`, `loadTariffs()`, `isLoading` |
| **Modelos de Datos / DTOs** (Campos de interfaces de la BD) | **Espanol** | `valorBase`, `consumoMinimoMensual`, `medidorId` |
| **Textos en Pantalla** (UI / HTML visible al usuario) | **Espanol** | `Guardar Cambios`, `Registrar Medidor` |
| **Comentarios de Codigo** | **Espanol** | `// Verificar si la lectura es menor que la anterior` |

> **Nota Importante:** Dado que la Base de Datos y el API del Backend manejan los nombres de los atributos de negocio en **Espanol** (ej. `valorBase`, `medidorId`), las interfaces de TypeScript del frontend deben mantener esos nombres en espanol para evitar re-mapeos innecesarios al enviar o recibir JSON.

---

## 2. Convenciones de Nomenclatura

### Archivos y Carpetas (`kebab-case`)
Todos los archivos y nombres de directorios deben escribirse en minusculas y separados por guiones:
*   *Componente*: `user-management.component.ts`
*   *Servicio*: `clients.service.ts`
*   *Interfaz*: `iclients.interface.ts`
*   *Carpeta*: `payment-agreements/`

### Clases y Componentes (`PascalCase`)
Los nombres de clases de Angular deben usar PascalCase y llevar el sufijo correspondiente de su rol:
```typescript
// Componentes
export class UserManagementComponent {}
export class ClientsFormComponent {}

// Servicios
export class ClientsService {}
export class TariffsService {}

// Pipes y Directivas
export class CapitalizePipe {}
export class HighlightDirective {}
```

### Interfaces TypeScript (`PascalCase` con prefijo `I`)
Para diferenciar rapidamente las interfaces de las clases y tipos:
```typescript
export interface IClient {
  id: number;
  nombres: string;
  activo: boolean;
}

export interface ICreateClientRequest {
  identificacion: string;
  email: string;
}
```

### Metodos, Funciones y Variables (`camelCase`)
Se deben escribir con minuscula inicial e ingles:
```typescript
// Variables
let clientList: IClient[] = [];
const isLoading = false;

// Metodos
loadClients(): void {}
onSubmitForm(): void {}
```

---

## 3. Estructura y Buenas Practicas de Angular

### 3.1 Componentes Standalone por Defecto
A partir de Angular 17 en adelante (este proyecto usa Angular 21), la arquitectura Standalone es la configuracion predeterminada. El CLI de Angular genera los componentes de forma standalone automaticamente sin necesidad de configuraciones adicionales.

Al no existir modulos globales, recuerda importar las dependencias del componente (como `CommonModule`, `FormsModule` u otros componentes) directamente en su arreglo `imports`:
```typescript
@Component({
  selector: 'app-tariffs',
  imports: [CommonModule, FormsModule, SharedButtonComponent],
  templateUrl: './tariffs.html',
  styleUrl: './tariffs.scss'
})
export class TariffsComponent {}
```

### 3.2 Inyección de Dependencias Moderna
No declares dependencias en el constructor. Utiliza la funcion `inject()`:
```typescript
// Recomendado
export class ClientsComponent {
  private readonly clientService = inject(ClientsService);
  private readonly toastService = inject(ToastService);
}

// Evitar
export class ClientsComponent {
  constructor(
    private clientService: ClientsService,
    private toastService: ToastService
  ) {}
}
```

### 3.3 Deteccion de Cambios Optimizada
Utiliza la estrategia `OnPush` para un rendimiento premium y avisa a Angular cuando re-renderizar mediante `ChangeDetectorRef`:
```typescript
@Component({
  ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  data: any[] = [];

  ngOnInit() {
    this.service.getData().subscribe(res => {
      this.data = res;
      this.cdr.markForCheck(); // Obligatorio para redibujar la UI con OnPush
    });
  }
}
```

---

## 4. Estilos y CSS
*   Usar preferentemente clases utilitarias de **Bootstrap 5** para diseno adaptable (grillas, espaciados, alertas).
*   Evitar estilos en linea (`style="margin-top: 10px;"`). Usar el archivo `.scss` del componente o clases de Bootstrap (`mt-2`).
*   Los nombres de clases personalizadas en SCSS deben ser en ingles y usar `kebab-case` (ej. `.table-container`, `.btn-submit`).
