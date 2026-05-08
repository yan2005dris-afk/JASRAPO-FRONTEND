import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesFormComponent } from './clientes-form.component';

describe('ClientesFormComponent', () => {
  let component: ClientesFormComponent;
  let fixture: ComponentFixture<ClientesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
