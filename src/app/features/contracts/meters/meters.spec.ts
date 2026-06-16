import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MetersComponent } from './meters';

describe('MetersComponent Component', () => {
  let component: MetersComponent;
  let fixture: ComponentFixture<MetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetersComponent], // Los standalone van en imports
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    // Creamos el componente en el entorno de pruebas
    fixture = TestBed.createComponent(MetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Simulamos que Angular renderiza el HTML
  });

  it('debería crearse el componente correctamente', () => {
    // expect() es la aserción: "Espero que el componente exista"
    expect(component).toBeTruthy();
  });
});
