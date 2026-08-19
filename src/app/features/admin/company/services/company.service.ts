import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ICompany,
  IUpdateCompanyDto,
  ICreateEstablecimientoDto,
  ICreatePuntoEmisionDto,
  IActivePuntoEmision,
} from '../interfaces/icompany.interface';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/empresa`;

  getCompany(): Observable<ICompany | null> {
    return this.http.get<ICompany | null>(this.apiUrl, {
      withCredentials: true,
    });
  }

  updateCompany(id: number, dto: IUpdateCompanyDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, {
      withCredentials: true,
    });
  }

  createEstablecimiento(emisorId: number, dto: ICreateEstablecimientoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${emisorId}/establecimientos`, dto, {
      withCredentials: true,
    });
  }

  createPuntoEmision(establecimientoId: number, dto: ICreatePuntoEmisionDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/establecimientos/${establecimientoId}/puntos-emision`, dto, {
      withCredentials: true,
    });
  }

  getActivePuntosEmision(): Observable<IActivePuntoEmision[]> {
    return this.http.get<IActivePuntoEmision[]>(`${this.apiUrl}/puntos-emision/active`, {
      withCredentials: true,
    });
  }

  uploadCertificado(emisorId: number, file: File, password: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    return this.http.post(`${this.apiUrl}/${emisorId}/certificado`, formData, {
      withCredentials: true,
    });
  }

  deleteCertificado(emisorId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${emisorId}/certificado`, {
      withCredentials: true,
    });
  }
}
