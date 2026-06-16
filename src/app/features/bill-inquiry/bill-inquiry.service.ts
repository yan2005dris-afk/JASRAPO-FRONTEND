import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface PlanillaMockResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConsultaPlanillaService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  consultar(termino: string, tipo: string): Observable<PlanillaMockResponse> {
    // For now, we simulate an API call with a delay
    // and return a mock response.
    // In the future, you can replace this with a real HTTP call:
    // return inject(HttpClient).get<PlanillaMockResponse>(`/api/planilla/${_tipo}/${_termino}`);

    // Simulate a 2-second delay
    return of({ message: 'This is a mock response' }).pipe(delay(2000));
  }
}
