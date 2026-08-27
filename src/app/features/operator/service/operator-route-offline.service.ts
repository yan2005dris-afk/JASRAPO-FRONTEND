import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import type { OperatorRouteResponse } from '../models/operator.models';
import { OperatorService } from './operator.service';

export interface OperatorRouteLoadResult {
  routes: OperatorRouteResponse[];
  source: 'network' | 'cache';
  cachedAt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorRouteOfflineService {
  private readonly operatorService = inject(OperatorService);
  private readonly authService = inject(AuthService);
  private readonly dbService = inject(IndexedDbService);
  private readonly networkService = inject(NetworkService);

  async loadAssignedRoutes(): Promise<OperatorRouteLoadResult> {
    const operatorId = this.authService.currentUser()?.id;
    if (!operatorId) {
      throw new Error('No se pudo identificar al operador para cargar sus rutas.');
    }

    const cacheScope = `operator:${operatorId}`;
    let networkError: unknown;

    if (this.networkService.isOnline()) {
      try {
        const routes = await firstValueFrom(this.operatorService.getRoutes());
        // No bloqueamos el flujo online por un fallo de persistencia: el operador
        // ya tiene los datos en pantalla. Solo logueamos para diagnóstico.
        await this.dbService
          .saveRoutesCache(cacheScope, routes)
          .catch((e) => console.warn('[routes-cache] persist failed', e));
        return { routes, source: 'network', cachedAt: null };
      } catch (error) {
        networkError = error;
      }
    }

    const snapshot = await this.dbService.getRoutesCache<OperatorRouteResponse>(cacheScope);
    if (snapshot) {
      return {
        routes: snapshot.items,
        source: 'cache',
        cachedAt: snapshot.savedAt,
      };
    }

    throw networkError ?? new Error('No hay rutas guardadas para usar sin conexion.');
  }
}
