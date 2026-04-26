import { Component, EventEmitter, inject, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SectoresService } from '../../services/sectores';
import { Sectores } from '../../models/sectores.interface';

@Component({
  selector: 'app-sectores-form',
  imports: [ReactiveFormsModule],
  templateUrl: './sectores-form.component.html',
  styleUrl: './sectores-form.component.css',
})
export class SectoresFormComponent implements OnInit {
  @Output() formClosed = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  @Input() sectorAEditar: Sectores | null = null;

  private readonly sectorService = inject(SectoresService);
  private readonly fb = inject(FormBuilder);

  //Variables de estado
  isEditMode = false; // se utiliza como bandera para indicar el estado de edicion del formulario UPDATE/CREATE

  sectorForm: FormGroup = this.fb.group({
    comunidadId: [0, Validators.required],
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
  });

  onClose() {
    this.formClosed.emit();
  }

  ngOnInit(): void {
    this.prepararFormulario();
  }

  prepararFormulario() {
    if (this.sectorAEditar) {
      this.isEditMode = true;
      this.sectorForm.patchValue({
        comunidadId: this.sectorAEditar.comunidadId,
        codigo: this.sectorAEditar.codigo,
        nombre: this.sectorAEditar.nombre,
      });
    }
  }

  onSubmit() {
    if (this.sectorForm.invalid) {
      this.sectorForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode && this.sectorAEditar !== null) {
      const sectorId = this.sectorAEditar.sectorId;
      if (sectorId === undefined || sectorId === null) {
        console.error('No se puede actualizar el sector porque no tiene sectorId.');
        return;
      }

      // se actualiza el sector
      this.sectorService.updateSector(sectorId, this.sectorForm.getRawValue())
        .subscribe({
          next: (response) => {
            console.log('Sector actualizado con éxito:', response);
            this.formSubmitted.emit();
            this.onClose();
          },
          error: (err) => {
            console.error('Error actualizando el sector:', err);
            console.error(err.error.message[0]);
          },
        });
    } else {
      // si no se ha leído ningun id, significa que vamos a crear uno nuevo
      this.sectorService.createSector(this.sectorForm.getRawValue()).subscribe({
        next: (response) => {
          console.log('Sector creado con éxito:', response);
          this.formSubmitted.emit();
          this.onClose();
        },
        error: (err) => {
          console.error('Error creando el sector:', err);
          console.error(err.error.message[0]);
        },
      });
    }
  }
}
