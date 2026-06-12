import { Component, inject, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

import { SectoresService } from '../../services/sectores';
import { Comunidad } from '../../../comunidades/models/comunidad.interface';
import { ComunidadesService } from '../../../comunidades/services/comunidades.service';

import { Sectores } from '../../models/sectores.interface';
import { Observable, map } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-sectores-form',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './sectores-form.component.html',
  styleUrl: './sectores-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectoresFormComponent implements OnInit {
  formClosed = output<void>();
  formSubmitted = output<void>();

  // esta variable viene del padre sectores-prueba, se ve en el html con [sectorAEditar]="objetoSectorAEditar"
  sectorAEditar = input<Sectores | null>(null);

  private readonly sectorService = inject(SectoresService);
  private readonly fb = inject(FormBuilder);
  private readonly comunidadesService = inject(ComunidadesService);
  private readonly toastService = inject(ToastService);

  // se cargan directamente los datos dentro de la variable.
  communitiesItems: Observable<Comunidad[]> = this.comunidadesService
    .getAllComunidades(1, 100)
    .pipe(map((response) => response.data));

  /*
  
   fetchComunitiesInDropdown(){
    this.sectorItems = this.sectorService.getAllSectores();
   }
  
    al hacerlo por separado tendremos errores porque primero se declara la variable y luego 
    se le asigna el valor (línea 29).
    Podemos saltarnos el ngOnInit y hacer la petición directamente en la declaración
    de la variable para evitar problemas de asincronía.

  */

  //Variables de estado
  isEditMode = false; // se utiliza como bandera para indicar el estado de edicion del formulario UPDATE/CREATE

  sectorForm: FormGroup = this.fb.group({
    comunidadId: [null, Validators.required],
    codigo: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
    nombre: ['', Validators.required],
  });

  //Propiedad para manejar el label del componente dropdown
  communitySelectedLabel = 'Seleccione una comunidad';

  onClose() {
    this.formClosed.emit();
  }

  /*
    El método preventSpaces impide el ingreso de espacios en blanco
    en el campo código. Se activa con el evento keydown.
  */
  preventSpaces(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  ngOnInit(): void {
    this.prepararFormulario();
  }

  prepararFormulario() {
    const sector = this.sectorAEditar();
    if (sector) {
      this.isEditMode = true;
      this.sectorForm.patchValue({
        comunidadId: sector.comunidadId,
        codigo: sector.codigo,
        nombre: sector.nombre,
      });
    }
  }

  onSubmit() {
    if (this.sectorForm.invalid) {
      this.sectorForm.markAllAsTouched();
      return;
    }

    const sector = this.sectorAEditar();
    if (this.isEditMode && sector !== null) {
      const sectorId = sector.sectorId;
      if (sectorId === undefined || sectorId === null) {
        console.error('No se puede actualizar el sector porque no tiene sectorId.');
        return;
      }

      // se actualiza el sector
      this.sectorService.updateSector(sectorId, this.sectorForm.getRawValue()).subscribe({
        next: (response) => {
          console.log('Sector actualizado con éxito:', response);
          this.toastService.success('Sector actualizado correctamente', 'Éxito');
          this.formSubmitted.emit();
          this.onClose();
        },
        error: (err) => {
          console.error('Error actualizando el sector:', err);
          const msg = err.error?.message || 'No se pudo actualizar el sector.';
          this.toastService.error(msg, 'Error');
        },
      });
    } else {
      // si no se ha leído ningun id, significa que vamos a crear uno nuevo
      this.sectorService.createSector(this.sectorForm.getRawValue()).subscribe({
        next: (response) => {
          console.log('Sector creado con éxito:', response);
          this.toastService.success('Sector creado correctamente', 'Éxito');
          this.formSubmitted.emit();
          this.onClose();
        },
        error: (err) => {
          console.error('Error creando el sector:', err);
          const msg = err.error?.message || 'No se pudo crear el sector.';
          this.toastService.error(msg, 'Error');
        },
      });
    }
  }
}
