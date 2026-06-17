import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MetersService } from './meters.service';

describe('MetersService', () => {
  let service: MetersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MetersService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetersService);
  });

  it('debería crearse el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });
});
