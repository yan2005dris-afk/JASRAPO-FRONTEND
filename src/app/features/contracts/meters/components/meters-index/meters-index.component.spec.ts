import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IndexMetersComponent } from './meters-index.component';

describe('MetersComponent Component', () => {
  let component: IndexMetersComponent;
  let fixture: ComponentFixture<IndexMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndexMetersComponent], // Los standalone van en imports
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    // Creamos el componente en el entorno de pruebas
    fixture = TestBed.createComponent(IndexMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Simulamos que Angular renderiza el HTML
  });

  it('debería crearse el componente correctamente', () => {
    // expect() es la aserción: "Espero que el componente exista"
    expect(component).toBeTruthy();
  });
});
