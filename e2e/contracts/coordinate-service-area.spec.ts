import { test, expect, Page, Locator } from '@playwright/test';
import { gotoApp } from '../helpers';

const CONTRACTS_ROUTE = '/app/Contratos/Contratos';
const OUT_OF_AREA_MESSAGE =
  'La ubicación seleccionada está fuera del perímetro del área de servicio';

const AREA = { north: -1.78, south: -1.82, west: -80.78, east: -80.74 };

const MOCK_SERVICE_AREA = {
  nombre: 'Área de prueba',
  fuente: 'e2e',
  geometria: {
    type: 'Polygon',
    coordinates: [
      [
        [AREA.west, AREA.south],
        [AREA.east, AREA.south],
        [AREA.east, AREA.north],
        [AREA.west, AREA.north],
        [AREA.west, AREA.south],
      ],
    ],
  },
};

const TRANSPARENT_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function openContractForm(page: Page) {
  await page.route('**/api/v1/contracts/service-area', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', json: MOCK_SERVICE_AREA }),
  );
  await page.route('**/tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_TILE }),
  );

  await gotoApp(page, CONTRACTS_ROUTE);
  await page.getByRole('button', { name: 'Agregar' }).click();
  await expect(page.getByRole('heading', { name: 'Ubicación del Predio' })).toBeVisible();
}

function picker(page: Page) {
  const root = page.locator('app-coordinate-map-picker');
  return {
    root,
    map: root.getByRole('region', { name: 'Mapa de ubicación del predio' }),
    boundary: root.locator('path.service-area-boundary'),
    latitud: root.getByLabel('Latitud'),
    longitud: root.getByLabel('Longitud'),
    marker: root.locator('.leaflet-marker-icon'),
    outOfAreaMessage: root.getByRole('alert').filter({ hasText: OUT_OF_AREA_MESSAGE }),
  };
}

async function boundaryBox(boundary: Locator) {
  let previous = await boundary.boundingBox();
  await expect
    .poll(async () => {
      const current = await boundary.boundingBox();
      const settled = JSON.stringify(current) === JSON.stringify(previous);
      previous = current;
      return settled;
    })
    .toBe(true);
  if (!previous) throw new Error('Service area boundary is not rendered');
  return previous;
}

async function typeCoordinates(page: Page, latitud: string, longitud: string) {
  const { latitud: latInput, longitud: lngInput } = picker(page);
  await latInput.fill(latitud);
  await lngInput.fill(longitud);
  await lngInput.press('Enter');
}

test.describe('Contratos — Ubicación del predio limitada al área de servicio', () => {
  test.use({ viewport: { width: 1600, height: 1000 } });

  test.beforeEach(async ({ page }) => {
    await openContractForm(page);
    const { map, boundary } = picker(page);
    await expect(boundary).toBeVisible();
    await map.scrollIntoViewIfNeeded();
  });

  test('un clic dentro del perímetro fija latitud y longitud', async ({ page }) => {
    const { boundary, latitud, longitud, marker, outOfAreaMessage } = picker(page);
    const box = await boundaryBox(boundary);

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(marker).toHaveCount(1);
    const lat = Number(await latitud.inputValue());
    const lng = Number(await longitud.inputValue());
    expect(lat).toBeGreaterThan(AREA.south);
    expect(lat).toBeLessThan(AREA.north);
    expect(lng).toBeGreaterThan(AREA.west);
    expect(lng).toBeLessThan(AREA.east);
    await expect(outOfAreaMessage).toHaveCount(0);
  });

  test('un clic fuera del perímetro muestra el mensaje y no fija coordenadas', async ({ page }) => {
    const { map, boundary, latitud, longitud, marker, outOfAreaMessage } = picker(page);
    const mapBox = await map.boundingBox();
    const areaBox = await boundaryBox(boundary);
    expect(areaBox.x - mapBox!.x).toBeGreaterThan(10);

    await page.mouse.click(mapBox!.x + 5, areaBox.y + areaBox.height / 2);

    await expect(outOfAreaMessage).toBeVisible();
    await expect(latitud).toHaveValue('');
    await expect(longitud).toHaveValue('');
    await expect(marker).toHaveCount(0);
  });

  test('coordenadas ingresadas fuera del perímetro se bloquean', async ({ page }) => {
    const { marker, outOfAreaMessage } = picker(page);

    await typeCoordinates(page, '-2.170000', '-79.922000');

    await expect(outOfAreaMessage).toBeVisible();
    await expect(marker).toHaveCount(0);
  });

  test('en el borde: un punto apenas dentro se acepta y uno apenas fuera se bloquea', async ({
    page,
  }) => {
    const { marker, outOfAreaMessage } = picker(page);

    await typeCoordinates(page, '-1.780010', '-80.760000');
    await expect(marker).toHaveCount(1);
    await expect(outOfAreaMessage).toHaveCount(0);

    await typeCoordinates(page, '-1.779990', '-80.760000');
    await expect(outOfAreaMessage).toBeVisible();

    await typeCoordinates(page, '-1.780010', '-80.740010');
    await expect(outOfAreaMessage).toHaveCount(0);
    await expect(marker).toHaveCount(1);
  });
});
