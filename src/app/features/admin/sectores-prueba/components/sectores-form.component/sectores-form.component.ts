import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SectoresService } from '../../services/sectores';

@Component({
  selector: 'app-sectores-form',
  imports: [ReactiveFormsModule],
  templateUrl: './sectores-form.component.html',
  styleUrl: './sectores-form.component.css',
})
export class SectoresFormComponent {
  @Output() formClosed = new EventEmitter<void>();
  private readonly sectorService = inject(SectoresService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  sectorForm: FormGroup = this.fb.group({
    comunidadId: [0, Validators.required],
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
  });

  onClose() {
    this.formClosed.emit();
  }

  onSubmit() {
    if (this.sectorForm.invalid) {
      this.sectorForm.markAllAsTouched();
      return;
    }

    const payload = this.sectorForm.value;
    payload.comunidadId = Number(payload.comunidadId);

    this.sectorService.createSector(payload).subscribe({
      next: (response) => {
        console.log('Sector creado con éxito:', response);
        this.onClose();
      },
      error: (err) => {
        console.error('Error creando el sector:', err);
        console.error(err.error.message[0]);
      },
    });
  }
}
