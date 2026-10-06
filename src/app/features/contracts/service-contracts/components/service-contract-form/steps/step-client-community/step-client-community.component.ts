import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IClient } from '../../../../../clients/domain/models/client.model';
import { Comunidad } from '../../../../../../admin/comunidades/models/comunidad.interface';

@Component({
  selector: 'app-step-client-community',
  templateUrl: './step-client-community.component.html',
  styleUrl: './step-client-community.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepClientCommunityComponent {
  readonly client = input<IClient | null>(null);
  readonly comunidad = input<Comunidad | null>(null);
  readonly submitted = input<boolean>(false);

  readonly pickClient = output<void>();
  readonly pickComunidad = output<void>();

  readonly clientName = computed(() => {
    const c = this.client();
    if (!c) {
      return '';
    }
    if (c.razonSocial) {
      return c.razonSocial;
    }
    return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim();
  });
}
