import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MetersIndexComponent } from './meters-index.component';

describe('MetersIndexComponent Component', () => {
  let component: MetersIndexComponent;
  let fixture: ComponentFixture<MetersIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetersIndexComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MetersIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse el componente correctamente', () => {
    // expect() es la aserción: "Espero que el componente exista"
    expect(component).toBeTruthy();
  });
});
