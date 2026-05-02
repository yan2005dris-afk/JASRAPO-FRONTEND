import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConsultaPlanillaService {

  private readonly http = inject(HttpClient);

  consultar(termino: string, tipo: string): Observable<unknown> {
    // For now, we simulate an API call with a delay
    // and return a mock response.
    // In the future, you can replace this with a real HTTP call:
    // return this.http.get(`/api/planilla/${tipo}/${termino}`);
    
    console.log(`Simulating consultation for ${tipo}: ${termino}`);
    
    // Simulate a 2-second delay
    return of({ message: 'This is a mock response' }).pipe(
      delay(2000)
    );
  }
}
