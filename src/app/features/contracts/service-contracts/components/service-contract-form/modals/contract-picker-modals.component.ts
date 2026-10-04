import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ClientsListComponent } from '../../../../clients/pages/clients-list/clients-list.component';
import { TariffsListComponent } from '../../../../tariffs/pages/tariffs-list/tariffs-list.component';
import { MetersIndexComponent } from '../../../../meters/components/meters-index/meters-index.component';
import { ReplaceMeterModalComponent } from '../../../../meters/components/replace-meter-modal/replace-meter-modal.component';
import { ComunidadesComponent } from '../../../../../admin/comunidades/comunidades.component';

import { IClient } from '../../../../clients/domain/models/client.model';
import { IMeter } from '../../../../meters/domain/models/meter.model';
import { ITariffCategory } from '../../../../tariffs/domain/models/tariff.model';
import { Comunidad } from '../../../../../admin/comunidades/models/comunidad.interface';
import { IContract } from '../../../domain/models/service-contract.model';

@Component({
  selector: 'app-contract-picker-modals',
  imports: [
    ClientsListComponent,
    TariffsListComponent,
    MetersIndexComponent,
    ReplaceMeterModalComponent,
    ComunidadesComponent,
  ],
  templateUrl: './contract-picker-modals.component.html',
  styleUrl: './contract-picker-modals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractPickerModalsComponent {
  readonly isClientPickerOpen = input<boolean>(false);
  readonly isComunidadPickerOpen = input<boolean>(false);
  readonly isMeterPickerOpen = input<boolean>(false);
  readonly isTariffPickerOpen = input<boolean>(false);
  readonly isReplaceMeterModalOpen = input<boolean>(false);
  readonly contractToEdit = input<IContract | null>(null);

  readonly closeClientPicker = output<void>();
  readonly clientSelected = output<IClient>();

  readonly closeComunidadPicker = output<void>();
  readonly comunidadSelected = output<Comunidad>();

  readonly closeMeterPicker = output<void>();
  readonly meterSelected = output<IMeter>();

  readonly closeTariffPicker = output<void>();
  readonly tariffSelected = output<ITariffCategory>();

  readonly closeReplaceMeterModal = output<void>();
  readonly meterReplaced = output<void>();
}
