import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-step-progress',
  standalone: true,
  templateUrl: './step-progress.component.html',
  styleUrl: './step-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepProgressComponent {
  readonly steps = input.required<string[]>();
  readonly activeStep = input.required<number>();
  readonly allowDirectNavigation = input<boolean>(false);

  readonly stepChange = output<number>();

  onStepClick(index: number): void {
    if (this.allowDirectNavigation() && index !== this.activeStep()) {
      this.stepChange.emit(index);
    }
  }

  isClickable(index: number): boolean {
    return this.allowDirectNavigation() && index !== this.activeStep();
  }
}
