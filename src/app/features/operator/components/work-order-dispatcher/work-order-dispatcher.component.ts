import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/interfaces/imeter.interface';
import type { WorkOrderActivityType } from '../../models/operator.models';
import type { WorkOrderFormPayload } from '../../models/work-order-form.models';
import { LecturaFormComponent } from '../work-order-forms/lectura-form.component';
import { InstalacionFormComponent } from '../work-order-forms/instalacion-form.component';
import { InspeccionFormComponent } from '../work-order-forms/inspeccion-form.component';
import { ReconexionFormComponent } from '../work-order-forms/reconexion-form.component';

@Component({
  selector: 'app-work-order-dispatcher',
  standalone: true,
  imports: [
    CommonModule,
    LecturaFormComponent,
    InstalacionFormComponent,
    InspeccionFormComponent,
    ReconexionFormComponent,
  ],
  template: `
    <div class="dispatcher-container">
      @switch (tipoActividad) {
        @case ('INSTALACION') {
          <app-instalacion-form
            [isSaving]="isSaving"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @case ('INSPECCION') {
          <app-inspeccion-form
            [isSaving]="isSaving"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @case ('RECONEXION') {
          <app-reconexion-form
            [isSaving]="isSaving"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @default {
          <app-lectura-form
            [lecturaAnterior]="lecturaAnterior"
            [isSaving]="isSaving"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
      }
    </div>
  `,
})
export class WorkOrderDispatcherComponent {
  @Input() meter!: IMeterDto;
  @Input() tipoActividad: WorkOrderActivityType = 'LECTURA';
  @Input() lecturaAnterior = 0;
  @Input() isSaving = false;

  @Output() submitted = new EventEmitter<WorkOrderFormPayload>();
  @Output() canceled = new EventEmitter<void>();
}
