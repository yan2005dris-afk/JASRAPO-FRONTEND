import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IMeter } from '../../../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../../../tariffs/domain/models/tariff.model';

@Component({
  selector: 'app-step-meter-tariff',
  templateUrl: './step-meter-tariff.component.html',
  styleUrl: './step-meter-tariff.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepMeterTariffComponent {
  readonly meter = input<IMeter | null>(null);
  readonly tariff = input<ITariffCategory | null>(null);
  readonly isEditing = input<boolean>(false);
  readonly submitted = input<boolean>(false);

  readonly pickMeter = output<void>();
  readonly replaceMeter = output<void>();
  readonly pickTariff = output<void>();

  readonly meterStatusLabel = computed(() => this.meter()?.estado?.nombre ?? '');

  readonly meterInstalacionLabel = computed(() => {
    const fecha = this.meter()?.fechaInstalacion;
    if (!fecha) {
      return 'Sin registro';
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? 'Sin registro' : d.toLocaleDateString('es-EC');
  });
}
