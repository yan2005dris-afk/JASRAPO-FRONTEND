import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMeterDto } from '../../../contracts/meters/domain/models/meter.model';
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
      @switch (tipoActividad()) {
        @case ('INSTALACION') {
          <app-instalacion-form
            [isSaving]="isSaving()"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @case ('INSPECCION') {
          <app-inspeccion-form
            [isSaving]="isSaving()"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @case ('RECONEXION') {
          <app-reconexion-form
            [isSaving]="isSaving()"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
        @default {
          <app-lectura-form
            [lecturaAnterior]="lecturaAnterior()"
            [initialLecturaActual]="initialLecturaActual()"
            [initialDescripcionAnomalia]="initialDescripcionAnomalia()"
            [isSaving]="isSaving()"
            (formSubmit)="submitted.emit($event)"
            (canceled)="canceled.emit()"
          />
        }
      }
    </div>
  `,
})
export class WorkOrderDispatcherComponent {
  readonly meter = input.required<IMeterDto>();
  readonly tipoActividad = input<WorkOrderActivityType>('LECTURA');
  readonly lecturaAnterior = input(0);
  readonly initialLecturaActual = input<number | null>(null);
  readonly initialDescripcionAnomalia = input<string | null>(null);
  readonly isSaving = input(false);

  readonly submitted = output<WorkOrderFormPayload>();
  readonly canceled = output<void>();
}
