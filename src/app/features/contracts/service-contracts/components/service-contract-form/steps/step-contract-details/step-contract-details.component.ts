import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IContract, IContractState } from '../../../../domain/models/service-contract.model';
import { ICoordinates, IPolygonGeometry } from '../../../../domain/models/service-area.model';
import { CoordinateMapPickerComponent } from '../../../../../../../shared/components/coordinate-map-picker/coordinate-map-picker.component';

@Component({
  selector: 'app-step-contract-details',
  imports: [ReactiveFormsModule, CoordinateMapPickerComponent],
  templateUrl: './step-contract-details.component.html',
  styleUrl: './step-contract-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepContractDetailsComponent {
  readonly form = input.required<FormGroup>();
  readonly previewNumeroGuia = input<string>('');
  readonly isEditing = input<boolean>(false);
  readonly isSuperAdmin = input<boolean>(false);
  readonly contractToEdit = input<IContract | null>(null);
  readonly submitted = input<boolean>(false);
  readonly stepAttempted = input<boolean>(false);
  readonly availableStates = input<IContractState[]>([]);
  readonly coordinates = input<ICoordinates>({ latitud: null, longitud: null });
  readonly coordinateError = input<string | null>(null);
  readonly serviceArea = input<IPolygonGeometry | null>(null);
  readonly communityMapCenter = input<ICoordinates | null>(null);
  readonly isFieldInvalid = input.required<(name: string) => boolean>();

  readonly coordinatesChange = output<ICoordinates>();
  readonly lecturaInicialInput = output<Event>();

  onLecturaInput(event: Event): void {
    this.lecturaInicialInput.emit(event);
  }

  onCoordsChange(coords: ICoordinates): void {
    this.coordinatesChange.emit(coords);
  }

  setTramitadorEsTitular(isTitular: boolean): void {
    const procedureGroup = this.form().get('procedure') as FormGroup;
    if (!procedureGroup) return;

    if (isTitular) {
      procedureGroup.patchValue({
        tramitadorEsTitular: true,
        tramitadorNombre: '',
        tramitadorIdentificacion: '',
        relacionTramitador: '',
      });
      procedureGroup.get('tramitadorNombre')?.markAsUntouched();
      procedureGroup.get('tramitadorIdentificacion')?.markAsUntouched();
      procedureGroup.get('relacionTramitador')?.markAsUntouched();
    } else {
      procedureGroup.patchValue({
        tramitadorEsTitular: false,
      });
    }
  }

  isProcedureControlInvalid(controlName: string): boolean {
    const control = this.form().get(`procedure.${controlName}`);
    return (
      !!control &&
      control.invalid &&
      (control.dirty || control.touched || this.stepAttempted() || this.submitted())
    );
  }
}
