import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { Sectores } from '../models/sectores.type';

@Injectable({
  providedIn: 'root',
})
export class SectoresService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getAllSectores(): Observable<Sectores[]> {
    let endpoint = this.API_URL + '/sector';
    return this.http.get<Sectores[]>(endpoint);
  }

}
