import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IComunidades } from '../interfaces/icomunidades.interface';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ComunidadesService {

  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;

  private readonly endpoint = this.baseUrl + '/communities';


  getAllComunidades(): Observable<IComunidades[]> {
    return this.http.get<IComunidades[]>(this.endpoint);
  }

}