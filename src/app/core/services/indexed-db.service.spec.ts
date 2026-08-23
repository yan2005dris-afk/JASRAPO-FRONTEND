import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexed-db.service';
import { vi, beforeAll, afterAll } from 'vitest';

describe('IndexedDbService', () => {
  let service: IndexedDbService;

  beforeAll(() => {
    const indexedDBMock = {
      open: vi.fn().mockReturnValue({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }),
    };
    vi.stubGlobal('indexedDB', indexedDBMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IndexedDbService],
    });
    service = TestBed.inject(IndexedDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
