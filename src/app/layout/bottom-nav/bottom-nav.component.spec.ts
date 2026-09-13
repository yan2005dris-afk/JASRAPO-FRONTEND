import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, beforeEach, it, expect } from 'vitest';
import { BottomNavComponent } from './bottom-nav.component';
import { OperatorSyncService } from '../../core/services/operator-sync.service';
import { AuthService } from '../../core/services/auth.service';
import { AppContextService } from '../../core/navigation/app-context.service';
import { SessionCapabilityGrant } from '../../core/models/auth.model';
import { AppContext } from '../../core/navigation/app-route.registry';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let fixture: ComponentFixture<BottomNavComponent>;
  let currentContextSignal = signal<AppContext>('operator');
  let isOperatorSignal = signal<boolean>(true);
  let capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);
  let totalQueuedSignal = signal<number>(0);

  beforeEach(async () => {
    currentContextSignal = signal<AppContext>('operator');
    isOperatorSignal = signal<boolean>(true);
    capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);
    totalQueuedSignal = signal<number>(0);

    const mockAuthService = {
      capabilities: capabilitiesSignal,
    };

    const mockAppContextService = {
      currentContext: currentContextSignal,
      isOperator: isOperatorSignal,
    };

    const mockSyncService = {
      totalQueued: totalQueuedSignal,
    };

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppContextService, useValue: mockAppContextService },
        { provide: OperatorSyncService, useValue: mockSyncService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return empty items and omit nav when context is backoffice', () => {
    currentContextSignal.set('backoffice');
    isOperatorSignal.set(false);
    capabilitiesSignal.set([
      { resource: 'routes', action: 'read' },
      { resource: 'lecturas', action: 'read' },
    ]);
    fixture.detectChanges();

    expect(component.bottomNavItems()).toEqual([]);
    expect(fixture.debugElement.query(By.css('nav.operator-bottom-nav'))).toBeFalsy();
  });

  it('should filter by capabilities and limit to 5 items in operator context', () => {
    currentContextSignal.set('operator');
    isOperatorSignal.set(true);
    capabilitiesSignal.set([
      { resource: 'routes', action: 'read' },
      { resource: 'lecturas', action: 'read' },
      { resource: 'work-order-novelties', action: 'read' },
      { resource: 'operator-sync', action: 'read' },
    ]);
    fixture.detectChanges();

    const items = component.bottomNavItems();
    expect(items.length).toBe(4);
    expect(items[0].label).toBe('Rutas');
    expect(items[1].label).toBe('Lecturas');
    expect(fixture.debugElement.query(By.css('nav.operator-bottom-nav'))).toBeTruthy();
  });
});
