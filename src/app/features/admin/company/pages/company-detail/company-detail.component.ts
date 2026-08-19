import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import {
  ICompany,
  IEstablecimiento,
  IUpdateCompanyDto,
  ICreateEstablecimientoDto,
  ICreatePuntoEmisionDto,
} from '../../interfaces/icompany.interface';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyDetailComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  company: ICompany | null = null;
  isLoading = true;
  isSaving = false;

  activeTab: 'general' | 'establecimientos' = 'general';

  // Modal Establecimiento
  showEstablecimientoModal = false;
  establecimientoDto: ICreateEstablecimientoDto = {
    codigo: '',
    direccion: '',
  };

  // Modal Punto de Emisión (Caja)
  showPuntoModal = false;
  selectedEstablecimientoForPunto: IEstablecimiento | null = null;
  puntoDto: ICreatePuntoEmisionDto = {
    codigo: '',
    descripcion: '',
  };

  // Certificado Digital Modal
  showCertModal = false;
  certPassword = '';
  selectedCertFile: File | null = null;
  isUploadingCert = false;

  ngOnInit(): void {
    this.loadCompany();
  }

  loadCompany(): void {
    this.isLoading = true;
    this.companyService.getCompany().subscribe({
      next: (res) => {
        this.company = res;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.company = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  saveCompany(): void {
    if (!this.company) return;

    const dto: IUpdateCompanyDto = {
      razonSocial: this.company.razonSocial,
      nombreComercial: this.company.nombreComercial,
      direccionMatriz: this.company.direccionMatriz,
      obligadoContabilidad: this.company.obligadoContabilidad,
      contribuyenteEspecial: this.company.contribuyenteEspecial,
      agenteRetencion: this.company.agenteRetencion,
      contribuyenteRimpe: this.company.contribuyenteRimpe,
      ambiente: this.company.ambiente,
      estado: this.company.estado,
    };

    this.isSaving = true;
    this.companyService.updateCompany(this.company.id, dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.show('Datos de la empresa actualizados exitosamente', 'success');
        this.loadCompany();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Error al actualizar la empresa', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // Establecimientos
  openCreateEstablecimientoModal(): void {
    this.establecimientoDto = { codigo: '', direccion: '' };
    this.showEstablecimientoModal = true;
    this.cdr.markForCheck();
  }

  closeEstablecimientoModal(): void {
    this.showEstablecimientoModal = false;
    this.cdr.markForCheck();
  }

  saveEstablecimiento(): void {
    if (!this.company) return;
    if (!this.establecimientoDto.codigo.trim() || this.establecimientoDto.codigo.length !== 3) {
      this.toastService.show(
        'El código de establecimiento debe tener 3 dígitos (ej: 001)',
        'error',
      );
      return;
    }
    if (!this.establecimientoDto.direccion.trim()) {
      this.toastService.show('Debe ingresar la dirección del establecimiento', 'error');
      return;
    }

    this.isSaving = true;
    this.companyService.createEstablecimiento(this.company.id, this.establecimientoDto).subscribe({
      next: () => {
        this.isSaving = false;
        this.showEstablecimientoModal = false;
        this.toastService.show('Sucursal / Establecimiento creado correctamente', 'success');
        this.loadCompany();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Error al crear el establecimiento', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // Puntos de Emisión / Cajas
  openCreatePuntoModal(est: IEstablecimiento): void {
    this.selectedEstablecimientoForPunto = est;
    this.puntoDto = { codigo: '', descripcion: '' };
    this.showPuntoModal = true;
    this.cdr.markForCheck();
  }

  closePuntoModal(): void {
    this.showPuntoModal = false;
    this.selectedEstablecimientoForPunto = null;
    this.cdr.markForCheck();
  }

  savePuntoEmision(): void {
    if (!this.selectedEstablecimientoForPunto) return;
    if (!this.puntoDto.codigo.trim() || this.puntoDto.codigo.length !== 3) {
      this.toastService.show(
        'El código de caja / punto de emisión debe tener 3 dígitos (ej: 001)',
        'error',
      );
      return;
    }

    this.isSaving = true;
    this.companyService
      .createPuntoEmision(this.selectedEstablecimientoForPunto.id, this.puntoDto)
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showPuntoModal = false;
          this.toastService.show('Caja / Punto de Emisión registrado exitosamente', 'success');
          this.loadCompany();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.show(err?.error?.message || 'Error al registrar la caja', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  // Certificado Digital
  openCertModal(): void {
    this.certPassword = '';
    this.selectedCertFile = null;
    this.showCertModal = true;
    this.cdr.markForCheck();
  }

  closeCertModal(): void {
    this.showCertModal = false;
    this.selectedCertFile = null;
    this.certPassword = '';
    this.cdr.markForCheck();
  }

  onCertFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCertFile = input.files[0];
    }
  }

  uploadCertificado(): void {
    if (!this.company) return;
    if (!this.selectedCertFile) {
      this.toastService.show('Debe seleccionar un archivo .p12 o .pfx', 'error');
      return;
    }
    if (!this.certPassword.trim()) {
      this.toastService.show('Debe ingresar la contraseña del certificado', 'error');
      return;
    }

    this.isUploadingCert = true;
    this.companyService
      .uploadCertificado(this.company.id, this.selectedCertFile, this.certPassword)
      .subscribe({
        next: () => {
          this.isUploadingCert = false;
          this.showCertModal = false;
          this.toastService.show('Certificado digital cargado y validado correctamente', 'success');
          this.loadCompany();
        },
        error: (err) => {
          this.isUploadingCert = false;
          this.toastService.show(
            err?.error?.message ||
              'Error al procesar el certificado digital. Verifique la contraseña.',
            'error',
          );
          this.cdr.markForCheck();
        },
      });
  }

  deleteCertificado(): void {
    if (!this.company) return;
    if (!confirm('¿Está seguro de eliminar el certificado digital actual?')) return;

    this.isSaving = true;
    this.companyService.deleteCertificado(this.company.id).subscribe({
      next: () => {
        this.isSaving = false;
        this.toastService.show('Certificado digital eliminado', 'success');
        this.loadCompany();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Error al eliminar el certificado', 'error');
        this.cdr.markForCheck();
      },
    });
  }
}
