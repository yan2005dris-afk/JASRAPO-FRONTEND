import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IndexedDbService } from '../../../core/services/indexed-db.service';
import { NetworkService } from '../../../core/services/network.service';
import type { OperatorRouteResponse, OperatorActivityType } from '../models/operator.models';
import { OperatorService } from './operator.service';

export type OperatorRouteLoadErrorKind = 'auth' | 'business' | 'network';

export interface OperatorRouteErrorInfo {
  kind: OperatorRouteLoadErrorKind;
  /** Spanish message ready to be rendered in the operator UI. */
  message: string;
  status?: number;
  retryable: boolean;
}

export interface OperatorRouteLoadResult {
  routes: OperatorRouteResponse[];
  source: 'network' | 'cache';
  cachedAt: string | null;
  /**
   * Non-null ONLY when the network call failed and cached routes were served as a fallback.
   * Lets the UI tell apart a business API error (e.g. 404 "No hay periodo ABIERTO") from a
   * genuine offline/network failure, instead of silently presenting stale data as current.
   */
  error: OperatorRouteErrorInfo | null;
}

/** Thrown when a route load fails and there is no cached fallback available. */
export class OperatorRouteLoadError extends Error {
  readonly info: OperatorRouteErrorInfo;
  readonly status?: number;

  constructor(info: OperatorRouteErrorInfo) {
    super(info.message);
    this.name = 'OperatorRouteLoadError';
    this.info = info;
    this.status = info.status;
  }
}

function serverMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (typeof body === 'object' && body !== null) {
    const value = (body as Record<string, unknown>)['message'];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/**
 * Classifies the source of a route-load failure:
 * - 401/403 → 'auth' (session/permissions); always re-thrown, never masked by a cache.
 * - 400..599 (real server response) → 'business' (e.g. 404 "No hay periodo ABIERTO", 409, 5xx).
 * - status 0 / non-HTTP / anything else → 'network' (offline, DNS, timeout, proxy).
 */
export function classifyRouteLoadError(error: unknown): OperatorRouteErrorInfo {
  if (error instanceof HttpErrorResponse) {
    const { status } = error;
    if (status === 401 || status === 403) {
      return {
        kind: 'auth',
        status,
        message: 'Tu sesión expiró o no tenés permisos para cargar tus rutas.',
        retryable: false,
      };
    }
    if (status >= 400 && status <= 599) {
      const message =
        serverMessage(error) ??
        (status === 404
          ? 'No se encontró la información solicitada. Puede que no haya un período ABIERTO o esté cerrado.'
          : status === 409
            ? 'Los datos del servidor cambiaron. Reintentá la descarga para actualizar.'
            : `Error de sincronización con el servidor (${status}).`);
      return { kind: 'business', status, message, retryable: true };
    }
    return {
      kind: 'network',
      status,
      message: 'No se pudo conectar con el servidor. Verificá tu conexión y reintentá.',
      retryable: true,
    };
  }
  return {
    kind: 'network',
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
  };
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

    if (this.networkService.isOnline()) {
      try {
        const routes = await firstValueFrom(this.operatorService.getRoutes());
        // No bloqueamos el flujo online por un fallo de persistencia: el operador
        // ya tiene los datos en pantalla. Solo logueamos para diagnóstico.
        await this.dbService
          .saveRoutesCache(cacheScope, routes)
          .catch((e) => console.warn('[routes-cache] persist failed', e));
        return { routes, source: 'network', cachedAt: null, error: null };
      } catch (error) {
        const classification = classifyRouteLoadError(error);
        // Autorización/sesión: nunca enmascarar con un snapshot local.
        if (classification.kind === 'auth') throw error;

        const snapshot = await this.dbService.getRoutesCache<OperatorRouteResponse>(cacheScope);
        if (snapshot) {
          // Fallback a datos guardados, pero informando POR QUÉ no son frescos (negocio vs red).
          return {
            routes: snapshot.items,
            source: 'cache',
            cachedAt: snapshot.savedAt,
            error: classification,
          };
        }
        throw new OperatorRouteLoadError(classification);
      }
    }

    // Offline real: nunca se intentó la red, el banner "datos guardados localmente" es correcto.
    const snapshot = await this.dbService.getRoutesCache<OperatorRouteResponse>(cacheScope);
    if (snapshot) {
      return {
        routes: snapshot.items,
        source: 'cache',
        cachedAt: snapshot.savedAt,
        error: null,
      };
    }

    throw new Error('No hay rutas guardadas para usar sin conexion.');
  }

  async loadActivityTypes(): Promise<OperatorActivityType[]> {
    const cacheScope = 'global:activity_types';
    let networkError: unknown;

    if (this.networkService.isOnline()) {
      try {
        const types = await firstValueFrom(this.operatorService.getActivityTypes());
        await this.dbService
          .saveActivityTypesCache(cacheScope, types)
          .catch((e) => console.warn('[activity-types-cache] persist failed', e));
        return types;
      } catch (error) {
        networkError = error;
      }
    }

    const snapshot = await this.dbService.getActivityTypesCache<OperatorActivityType>(cacheScope);
    if (snapshot) {
      return snapshot.items;
    }

    throw networkError ?? new Error('No hay tipos de actividad guardados para usar sin conexion.');
  }
}
