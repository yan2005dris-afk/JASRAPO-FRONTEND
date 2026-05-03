import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Medidores } from './medidores';

describe('Medidores Component', () => {
  let component: Medidores;
  let fixture: ComponentFixture<Medidores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medidores], // Los standalone van en imports
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    // Creamos el componente en el entorno de pruebas
    fixture = TestBed.createComponent(Medidores);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Simulamos que Angular renderiza el HTML
  });

  it('debería crearse el componente correctamente', () => {
    // expect() es la aserción: "Espero que el componente exista"
    expect(component).toBeTruthy();
  });
});