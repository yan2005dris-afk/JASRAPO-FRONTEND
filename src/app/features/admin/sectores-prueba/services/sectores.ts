import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.development';
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
  private API_URL = environment.apiUrl;

  // METODOS CRUD
  // ============================================================================

  // CREATE
  createSector(sector: Sectores): Observable<Sectores> {
    let endpoint = this.API_URL + '/sector';

    return this.http.post<Sectores>(endpoint, sector);
  }


  // READ ALL
  getAllSectores(): Observable<Sectores[]> {
    let endpoint = this.API_URL + '/sector';
    return this.http.get<Sectores[]>(endpoint);
  }

  // READ ONE
  getSectorById(id: number): Observable<Sectores> {
    let endpoint = this.API_URL + '/sector/' + id;
    return this.http.get<Sectores>(endpoint);
  }

  // UPDATE
  updateSector(id: number, sector: Sectores): Observable<Sectores> {
    let endpoint = this.API_URL + '/sector/' + id;

    return this.http.patch<Sectores>(endpoint, sector);
  }

  // DELETE
  deleteSector(id: number): Observable<Sectores> {
    let endpoint = this.API_URL + '/sector/' + id;

    return this.http.delete<Sectores>(endpoint);
  }
}
