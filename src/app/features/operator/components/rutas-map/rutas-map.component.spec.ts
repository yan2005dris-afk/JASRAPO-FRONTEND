import { TestBed } from '@angular/core/testing';
import { RutasMapComponent, MapPoint } from './rutas-map.component';
import { NetworkService } from '../../../../core/services/network.service';
import { signal } from '@angular/core';

describe('RutasMapComponent', () => {
  const mockPoints: MapPoint[] = [
    {
      routeId: '1',
      lat: -0.9677,
      lng: -80.7089,
      estado: 'PENDIENTE',
      tipoRuta: 'LECTURA',
      popupHtml: '<b>Punto 1</b>',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RutasMapComponent],
      providers: [
        {
          provide: NetworkService,
          useValue: {
            isOnline: signal(true),
          },
        },
      ],
    });
  });

  it('creates successfully and manages degraded offline mode', () => {
    const fixture = TestBed.createComponent(RutasMapComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('points', mockPoints);
    fixture.detectChanges();

    expect(comp.isDegradedMap()).toBe(false);

    comp.tileLayerUnavailable.set(true);
    expect(comp.isDegradedMap()).toBe(true);
  });
});
