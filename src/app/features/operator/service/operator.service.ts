import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OperatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/operator`;

  syncAllMeters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.endpoint}/sync`);
  }
}