import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IEstadoMedidor,
  IMedidor,
  CrearMedidorPayload,
  EditarEstadoMedidorPayload,
} from '../interfaces/imedidor.interface';
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

  getEstadosMedidor(): Observable<IEstadoMedidor[]> {
    return this.http.get<IEstadoMedidor[]>(`${this.endpoint}/status`);
  }

  /**
   * Registra un nuevo medidor en la base de datos.
   * @param medidor Datos del nuevo registro (basados en la interfaz CrearMedidorPayload).
   * @returns Observable con el objeto del medidor persistido.
   */
  createMedidor(payload: CrearMedidorPayload): Observable<IMedidor> {
    return this.http.post<IMedidor>(this.endpoint, payload);
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
   * @param id Identificador del registro a modificar.
   * @param changes Objeto con las propiedades a actualizar (limpia el medidorId internamente).
   * @returns Observable con la entidad del medidor actualizada.
   */
  updateMedidor(id: number, changes: EditarEstadoMedidorPayload): Observable<IMedidor> {
    const { medidorId, ...payloadLimpio } = changes;
    return this.http.patch<IMedidor>(`${this.endpoint}/${id}`, payloadLimpio);
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
