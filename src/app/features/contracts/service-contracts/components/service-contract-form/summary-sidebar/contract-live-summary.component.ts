import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IClient } from '../../../../clients/domain/models/client.model';
import { IMeter } from '../../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../../tariffs/domain/models/tariff.model';
import { Comunidad } from '../../../../../admin/comunidades/models/comunidad.interface';
import { ICoordinates } from '../../../domain/models/service-area.model';

@Component({
  selector: 'app-contract-live-summary',
  templateUrl: './contract-live-summary.component.html',
  styleUrl: './contract-live-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractLiveSummaryComponent {
  readonly client = input<IClient | null>(null);
  readonly comunidad = input<Comunidad | null>(null);
  readonly meter = input<IMeter | null>(null);
  readonly tariff = input<ITariffCategory | null>(null);
  readonly previewNumeroGuia = input<string>('');
  readonly coordinates = input<ICoordinates>({ latitud: null, longitud: null });

  readonly clientDisplayName = computed(() => {
    const c = this.client();
    if (!c) return null;
    if (c.razonSocial) return c.razonSocial;
    return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim();
  });
}
