import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SpinnerService } from '../../../core/services/spinner.service';

@Component({
  selector: 'app-spinner',
  imports: [NgTemplateOutlet],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.css',
})
export class Spinner {
  private spinnerService = inject(SpinnerService);
  customSpinner = this.spinnerService.customSpinner;
  spinner = this.spinnerService.spinner;
}
