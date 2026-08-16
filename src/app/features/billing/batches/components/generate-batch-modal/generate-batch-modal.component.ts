import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchesService } from '../../services/batches.service';
import { IGenerateBatchDto } from '../../interfaces/ibatch.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-generate-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-batch-modal.component.html',
  styleUrl: './generate-batch-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateBatchModalComponent {
  private readonly batchesService = inject(BatchesService);
  private readonly toastService = inject(ToastService);

  readonly generated = output<void>();
  readonly closed = output<void>();

  periodoId = 1;
  comunidadId: number | null = null;
  isLoading = false;

  get isFormValid(): boolean {
    return this.periodoId > 0;
  }

  submitGenerate(): void {
    if (!this.isFormValid || this.isLoading) return;

    const dto: IGenerateBatchDto = {
      periodoId: Number(this.periodoId),
    };

    if (this.comunidadId) {
      dto.comunidadId = Number(this.comunidadId);
    }

    this.isLoading = true;
    this.batchesService.generateBatch(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toastService.show(res.message || 'Lote de facturación generado exitosamente', 'success');
        this.generated.emit();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Error al generar el lote de facturación';
        this.toastService.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
