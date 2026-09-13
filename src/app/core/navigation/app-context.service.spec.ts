import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AppContextService } from './app-context.service';
import { AuthService } from '../services/auth.service';
import { SessionCapabilityGrant } from '../models/auth.model';

describe('AppContextService', () => {
  let service: AppContextService;
  let events$: Subject<unknown>;
  let navigateMock: ReturnType<typeof vi.fn>;
  let capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);

  beforeEach(() => {
    events$ = new Subject();
    navigateMock = vi.fn();
    capabilitiesSignal = signal<SessionCapabilityGrant[]>([]);
    TestBed.configureTestingModule({
      providers: [
        AppContextService,
        {
          provide: Router,
          useValue: {
            events: events$,
            routerState: { snapshot: { root: {} as ActivatedRouteSnapshot } },
            navigate: navigateMock,
          },
        },
        {
          provide: AuthService,
          useValue: {
            capabilities: capabilitiesSignal,
          },
        },
      ],
    });
    service = TestBed.inject(AppContextService);
  });

  it('defaults to backoffice context', () => {
    expect(service.currentContext()).toBe('backoffice');
    expect(service.isBackoffice()).toBe(true);
    expect(service.isOperator()).toBe(false);
  });

  it('resolves context correctly from routeId', () => {
    expect(service.getContextFromRouteId('operator-routes')).toBe('operator');
    expect(service.getContextFromRouteId('backoffice-dashboard')).toBe('backoffice');
    expect(service.getContextFromRouteId('unknown')).toBe('backoffice');
    expect(service.getContextFromRouteId(null)).toBe('backoffice');
  });

  it('detects dual context when user has both operator and backoffice capabilities', () => {
    expect(service.hasDualContext()).toBe(false);

    capabilitiesSignal.set([
      { resource: 'dashboard', action: 'read' },
      { resource: 'routes', action: 'read' },
    ]);

    expect(service.canAccessBackoffice()).toBe(true);
    expect(service.canAccessOperator()).toBe(true);
    expect(service.hasDualContext()).toBe(true);
  });

  it('navigates to appropriate route when switching context', () => {
    capabilitiesSignal.set([
      { resource: 'dashboard', action: 'read' },
      { resource: 'routes', action: 'read' },
    ]);

    service.switchToContext('operator');
    expect(navigateMock).toHaveBeenCalledWith(['/app/operator/routes']);

    service.switchToContext('backoffice');
    expect(navigateMock).toHaveBeenCalledWith(['/app/backoffice/dashboard']);
  });

  it('updates context when setting context or traversing snapshot', () => {
    service.setContext('operator');
    expect(service.currentContext()).toBe('operator');
    expect(service.isOperator()).toBe(true);

    const snapshot = {
      data: {},
      firstChild: {
        data: { routeId: 'operator-readings' },
        firstChild: null,
      },
    } as unknown as ActivatedRouteSnapshot;

    service.updateContextFromRoot(snapshot);
    expect(service.currentContext()).toBe('operator');
  });
});
