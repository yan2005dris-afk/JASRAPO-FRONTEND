import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, beforeEach, it, expect } from 'vitest';
import { OperatorContextLayoutComponent } from './operator-context-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { OperatorSyncService } from '../../core/services/operator-sync.service';

describe('OperatorContextLayoutComponent', () => {
  let component: OperatorContextLayoutComponent;
  let fixture: ComponentFixture<OperatorContextLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorContextLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            capabilities: signal([{ resource: 'routes', action: 'read' }]),
          },
        },
        {
          provide: OperatorSyncService,
          useValue: {
            totalQueued: signal(0),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatorContextLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create operator context layout', () => {
    expect(component).toBeTruthy();
  });

  it('renders bottom nav component', () => {
    const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav');
    expect(bottomNav).toBeTruthy();
  });
});
