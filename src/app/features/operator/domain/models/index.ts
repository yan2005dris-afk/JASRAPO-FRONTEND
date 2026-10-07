import type { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';
import type { WorkOrderState, WorkOrderActivityType } from '../../models/operator.models';

export * from '../../models/operator.models';
export * from '../../models/work-order-form.models';
export * from '../../readings/readings.models';
export type { IMeterDto };

export interface AssignedWorkOrder {
  id: string;
  estado: WorkOrderState;
  lecturaId?: string;
}

export interface ReadingRecord {
  lecturaId?: string;
  _lecturaId?: string;
  medidorId?: string | number;
  medidor?: { medidorId?: string | number; serie?: string };
  lecturaActual?: number;
  lecturaAnterior?: number;
  estado?: string;
  syncState?: string;
  contratoId?: string | number;
  [key: string]: unknown;
}
