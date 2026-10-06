import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';
import { AuthService } from './auth.service';
import { IMeterDto } from '../../features/contracts/meters/domain/models/meter.model';

@Injectable({ providedIn: 'root' })
export class MeterCacheService {
  private readonly dbService = inject(IndexedDbService);
  private readonly authService = inject(AuthService);
  readonly metersList = signal<IMeterDto[]>([]);

  async load(): Promise<void> {
    try {
      const operatorId = this.authService.currentUser()?.id;
      const scope = operatorId ? `operator:${operatorId}` : undefined;
      const cached = await this.dbService.getMetersCache(scope);
      this.metersList.set(cached);
    } catch (e) {
      console.error('Error loading meter cache:', e);
    }
  }
}
