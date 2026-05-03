import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IMedidor } from '../interfaces/imedidor.interface';
import { environment } from '../../../../../environments/environment';

/**
 * Servicio de Comunicación de Inventario de Medidores
 * Gestiona todas las operaciones HTTP (CRUD) contra el endpoint de medidores.
 */
@Injectable({
  providedIn: 'root',
})
export class MedidoresService {
  // Inyección de dependencias y configuración de rutas
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseUrl}/meters`;

  /**
   * Registra un nuevo medidor en la base de datos.
   * @param medidor Datos del nuevo registro (basados en la interfaz IMedidor).
   * @returns Observable con el objeto del medidor persistido.
   */
  createMedidor(medidor: Partial<IMedidor>): Observable<IMedidor> {
    return this.http.post<IMedidor>(this.endpoint, medidor);
  }

  /**
   * Recupera la colección completa de medidores registrados.
   * @returns Observable con el arreglo de medidores para la tabla de inventario.
   */
  getMedidores(): Observable<IMedidor[]> {
    return this.http.get<IMedidor[]>(this.endpoint);
  }

  /**
   * Consulta la información detallada de un solo registro.
   * @param id Identificador único numérico del medidor.
   * @returns Observable con la entidad del medidor solicitada.
   */
  getMedidorById(id: number): Observable<IMedidor> {
    return this.http.get<IMedidor>(`${this.endpoint}/${id}`);
  }

  /**
   * Realiza una actualización parcial de los datos de un medidor.
   * Se utiliza principalmente para transiciones de estado y edición de metadatos.
   * @param id Identificador del registro a modificar.
   * @param changes Objeto que contiene exclusivamente las propiedades a actualizar.
   * @returns Observable con el estado actualizado del medidor.
   */
  updateMedidor(id: number, changes: Partial<IMedidor>): Observable<IMedidor> {
    return this.http.patch<IMedidor>(`${this.endpoint}/${id}`, changes);
  }

  /**
   * Remueve de forma definitiva un medidor del sistema.
   * @param id Identificador del registro a eliminar.
   * @returns Observable de finalización de la tarea.
   */
  deleteMedidor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
