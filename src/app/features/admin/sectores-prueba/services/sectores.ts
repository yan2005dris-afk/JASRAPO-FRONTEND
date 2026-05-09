import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { Sectores } from '../models/sectores.interface';

@Injectable({
  providedIn: 'root',
})
export class SectoresService {
  // INYECCION DE DEPENDENCIAS
  // ============================================================================

  // Http client para peticiones http
  private http = inject(HttpClient);

  // VARIABLES
  // ============================================================================

  // Obtener url de la api
  private readonly API_URL = environment.apiUrl;
  private readonly endpoint = this.API_URL + '/sectors';

  // METODOS CRUD
  // ============================================================================

  // CREATE
  createSector(sector: Sectores): Observable<Sectores> {
    return this.http.post<Sectores>(this.endpoint, sector);
  }

  // READ ALL
  getAllSectores(): Observable<Sectores[]> {
    return this.http.get<Sectores[]>(this.endpoint);
  }

  // READ ONE
  getSectorById(id: number): Observable<Sectores> {
    return this.http.get<Sectores>(this.endpoint + '/' + id);
  }

  // UPDATE
  updateSector(id: number, sector: Sectores): Observable<Sectores> {
    return this.http.patch<Sectores>(`${this.endpoint}/${id}`, sector);
  }

  // DELETE
  deleteSector(id: number): Observable<Sectores> {
    return this.http.delete<Sectores>(`${this.endpoint}/${id}`);
  }
}
