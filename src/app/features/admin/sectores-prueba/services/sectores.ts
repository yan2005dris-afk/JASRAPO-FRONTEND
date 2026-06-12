import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { Sectores, PaginatedSectoresResponse } from '../models/sectores.interface';

@Injectable({
  providedIn: 'root',
})
export class SectoresService {
  private http = inject(HttpClient);

  private readonly API_URL = environment.apiUrl;
  private readonly endpoint = this.API_URL + '/sectors';

  createSector(sector: Sectores): Observable<Sectores> {
    return this.http.post<Sectores>(this.endpoint, sector);
  }

  getAllSectores(page = 1, limit = 10): Observable<PaginatedSectoresResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedSectoresResponse>(this.endpoint, { params });
  }

  getSectorById(id: number): Observable<Sectores> {
    return this.http.get<Sectores>(this.endpoint + '/' + id);
  }

  updateSector(id: number, sector: Sectores): Observable<Sectores> {
    return this.http.patch<Sectores>(`${this.endpoint}/${id}`, sector);
  }

  deleteSector(id: number): Observable<Sectores> {
    return this.http.delete<Sectores>(`${this.endpoint}/${id}`);
  }
}
