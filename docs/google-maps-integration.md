# Google Maps Integration — TasksComponent

## What exists now

`tasks.component.html` has a placeholder div `#map` at line 41 with text "Integración con Google Maps pendiente". The tasks already come from the backend ordered by `orden` (nearest-neighbor algorithm). Each task has `medidor.latitud` and `medidor.longitud` when available.

## Step 1 — Get an API Key

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable **Maps JavaScript API**
4. Create a credential → **API Key**
5. Restrict the key to your domain (production) and `localhost` (dev)

## Step 2 — Install `@angular/google-maps`

```bash
npm install @angular/google-maps
```

Angular 21 — no extra type packages needed, `@angular/google-maps` ships its own types.

## Step 3 — Add the Maps script to `index.html`

```html
<!-- src/index.html — before </body> -->
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"
  async
  defer
></script>
```

Or load it dynamically (better for lazy-loaded routes):

```ts
// In tasks.component.ts ngOnInit, before rendering the map:
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
script.async = true;
document.head.appendChild(script);
```

Add to `src/environments/environment.ts` and `environment.prod.ts`:

```ts
export const environment = {
  // ... existing
  googleMapsApiKey: 'YOUR_API_KEY',
};
```

## Step 4 — Update `tasks.component.ts`

```ts
import { GoogleMap, MapMarker, MapInfoWindow } from '@angular/google-maps';

// Add to imports array:
imports: [CommonModule, GoogleMap, MapMarker, MapInfoWindow],

// Add signals:
readonly mapCenter = signal<google.maps.LatLngLiteral>({ lat: -0.9677, lng: -80.7089 }); // default: Manabí
readonly mapZoom = signal<number>(13);
readonly selectedTask = signal<TaskResponse | null>(null);

// Computed: only tasks with coordinates
readonly tasksWithCoords = computed(() =>
  this.filteredTasks().filter(t => t.medidor?.latitud != null && t.medidor?.longitud != null)
);

// When tasks load, center map on first task
private centerMapOnFirstTask(): void {
  const first = this.tasksWithCoords()[0];
  if (first?.medidor?.latitud && first?.medidor?.longitud) {
    this.mapCenter.set({ lat: first.medidor.latitud, lng: first.medidor.longitud });
  }
}
```

## Step 5 — Update `tasks.component.html` map section

Replace the placeholder div with:

```html
@if (viewMode() === 'map') {
  <div class="map-section">
    <google-map
      [center]="mapCenter()"
      [zoom]="mapZoom()"
      width="100%"
      height="500px"
    >
      @for (task of tasksWithCoords(); track task.rutaId) {
        <map-marker
          [position]="{ lat: task.medidor!.latitud!, lng: task.medidor!.longitud! }"
          [label]="task.orden.toString()"
          [title]="task.nombre"
          (mapClick)="selectedTask.set(task)"
        />
      }

      @if (selectedTask(); as task) {
        <map-info-window>
          <div class="map-info">
            <strong>#{{ task.orden }} — {{ task.nombre }}</strong>
            <span class="route-badge badge-{{ task.tipoRuta.toLowerCase() }}">
              {{ getRouteTypeLabel(task.tipoRuta) }}
            </span>
            @if (task.medidor) {
              <p>Serie: {{ task.medidor.serie }}</p>
            }
          </div>
        </map-info-window>
      }
    </google-map>

    <!-- Ordered list below map -->
    <div class="map-task-list">
      <h2 class="map-task-list-title">Orden de visita</h2>
      @for (task of filteredTasks(); track task.rutaId) {
        <div class="map-task-row" [class.no-coords]="!task.medidor?.latitud">
          <span class="task-orden-badge">{{ task.orden }}</span>
          <span class="task-name">{{ task.nombre }}</span>
          @if (!task.medidor?.latitud) {
            <span class="task-no-coords">Sin coordenadas</span>
          }
        </div>
      }
    </div>
  </div>
}
```

## Step 6 — Draw the route polyline (optional but useful)

Add a `MapPolyline` to draw the path between markers in `orden` order:

```ts
import { MapPolyline } from '@angular/google-maps';

// imports: [..., MapPolyline]

readonly routePath = computed<google.maps.LatLngLiteral[]>(() =>
  this.filteredTasks()
    .filter(t => t.medidor?.latitud != null)
    .sort((a, b) => a.orden - b.orden)
    .map(t => ({ lat: t.medidor!.latitud!, lng: t.medidor!.longitud! }))
);
```

In template, inside `<google-map>`:

```html
<map-polyline
  [path]="routePath()"
  [options]="{ strokeColor: '#4285F4', strokeWeight: 3 }"
/>
```

## Files to modify

| File | Change |
|------|--------|
| `src/index.html` OR `tasks.component.ts` | Load Maps JS SDK |
| `src/environments/environment.ts` | Add `googleMapsApiKey` |
| `src/environments/environment.prod.ts` | Add `googleMapsApiKey` (prod key) |
| `src/app/features/operator/tasks/tasks.component.ts` | Import `GoogleMap`, `MapMarker`, `MapInfoWindow`, `MapPolyline`; add signals |
| `src/app/features/operator/tasks/tasks.component.html` | Replace placeholder with `<google-map>` |
| `package.json` | `npm install @angular/google-maps` |

## Notes

- Tasks without coordinates (`latitud`/`longitud` null) appear in the ordered list but NOT as markers on the map.
- The backend already calculates the optimal visit order via nearest-neighbor (Haversine). The frontend just renders it — no route calculation needed client-side.
- For production, consider loading the Maps SDK lazily only when the user switches to map view.
