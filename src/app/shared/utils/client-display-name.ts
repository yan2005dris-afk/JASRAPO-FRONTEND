export interface ClientDisplayNameSource {
  razonSocial?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  identificacion?: string | null;
}

export function resolveClientDisplayName(client: ClientDisplayNameSource): string {
  const corporateName = client.razonSocial?.trim();
  if (corporateName) return corporateName;

  const personalName = [client.nombres, client.apellidos]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  if (personalName) return personalName;

  const identification = client.identificacion?.trim();
  return identification ? `Cliente ${identification}` : 'Cliente sin nombre registrado';
}
