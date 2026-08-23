import { Injectable, inject, signal } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';
import { IMeterDto } from '../../features/contracts/meters/interfaces/imeter.interface';

@Injectable({ providedIn: 'root' })
export class MeterCacheService {
  private readonly dbService = inject(IndexedDbService);
  readonly metersList = signal<IMeterDto[]>([]);

  async load(): Promise<void> {
    try {
      const cached = await this.dbService.getMetersCache();
      this.metersList.set(cached);
    } catch (e) {
      console.error('Error loading meter cache:', e);
    }
  }
}
