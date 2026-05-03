import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MedidoresService } from './medidores.service';

describe('MedidoresService', () => {
  let service: MedidoresService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MedidoresService,
        provideHttpClient(),
        provideHttpClientTesting()
      ],
    });
    service = TestBed.inject(MedidoresService);
  });

  it('debería crearse el servicio correctamente', () => {
    expect(service).toBeTruthy();
  });
});