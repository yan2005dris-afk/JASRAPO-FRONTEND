import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IClient } from '../../../../../clients/domain/models/client.model';
import { Comunidad } from '../../../../../../admin/comunidades/models/comunidad.interface';
import { IMeter } from '../../../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../../../tariffs/domain/models/tariff.model';
import { ICoordinates } from '../../../../domain/models/service-area.model';

@Component({
  selector: 'app-step-contract-summary',
  templateUrl: './step-contract-summary.component.html',
  styleUrl: './step-contract-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepContractSummaryComponent {
  readonly client = input<IClient | null>(null);
  readonly comunidad = input<Comunidad | null>(null);
  readonly meter = input<IMeter | null>(null);
  readonly tariff = input<ITariffCategory | null>(null);
  readonly previewNumeroGuia = input<string>('');
  readonly lecturaInicial = input<string>('0');
  readonly direccionSuministro = input<string>('');
  readonly coordinates = input<ICoordinates>({ latitud: null, longitud: null });

  readonly goToStep = output<number>();

  readonly clientName = computed(() => {
    const c = this.client();
    if (!c) return '';
    if (c.razonSocial) return c.razonSocial;
    return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim();
  });

  readonly meterStatusLabel = computed(() => this.meter()?.estado?.nombre ?? '');
}
