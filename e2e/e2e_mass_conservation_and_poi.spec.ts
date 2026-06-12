import { expect, test } from '@playwright/test'

const API_BASE = 'http://localhost:8000'
const TOTAL_POPULATION = 10_000
const GRID_SIZE = 20
const POI_ROW = 8
const POI_COL = 11

function makeMatrix(step: number, kind: 'density' | 'attraction') {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => {
      const distance = Math.hypot(row - POI_ROW, col - POI_COL)
      const mooreNeighbourhoodBoost = distance <= Math.SQRT2 ? 0.25 : 0
      const softmaxLikeAttractor = Math.exp(-distance / 3)
      const base = kind === 'attraction' ? softmaxLikeAttractor : softmaxLikeAttractor * 0.7 + mooreNeighbourhoodBoost
      return Number((base + step * 0.0001).toFixed(6))
    }),
  )
}

function makeSteps() {
  return Array.from({ length: 51 }, (_, step) => ({
    tiempo: step,
    densidad: makeMatrix(step, 'density'),
    atractivo: makeMatrix(step, 'attraction'),
    total_poblacion: TOTAL_POPULATION,
  }))
}

test('conserves mass and renders stronger heatmap around injected POI', async ({ page }) => {
  const steps = makeSteps()
  let createPayload: Record<string, unknown> | null = null
  let statusCalls = 0
  let pasosResponse: typeof steps | null = null

  await page.route(`${API_BASE}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, nombre_completo: 'QA SDET', email: 'qa@example.test', rol_id: 3, activo: true }),
    })
  })

  await page.route(`${API_BASE}/observations/pois`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pois: [{ id: 'poi-qa', nombre: 'POI QA', tipo_poi: 'comedor_social', latitud: 3.4, longitud: -76.52, peso: 1, radio_influencia: 3 }],
      }),
    })
  })

  await page.route(`${API_BASE}/api/mapas/rutas/123**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rutas: [] }) })
  })

  await page.route(`${API_BASE}/api/simulaciones/ejecutar`, async (route) => {
    createPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ejecucion_id: 123, estado: 'pendiente', progreso: 0, mensaje: 'Aceptada' }),
    })
  })

  await page.route(`${API_BASE}/api/simulaciones/123/estado`, async (route) => {
    statusCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        statusCalls === 1
          ? { ejecucion_id: 123, estado: 'en_proceso', progreso: 50, pasos_listos: 25 }
          : { ejecucion_id: 123, estado: 'finalizado', progreso: 100, total_pasos: 51 },
      ),
    })
  })

  await page.route(`${API_BASE}/api/simulaciones/123/pasos`, async (route) => {
    pasosResponse = steps
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(steps) })
  })

  await page.addInitScript(() => localStorage.setItem('auth_token', 'qa-token'))
  await page.goto('/simulation')

  await page.getByRole('button', { name: /iniciar/i }).click()
  await expect.poll(() => createPayload?.generaciones).toBe(100)
  expect(createPayload?.tasa_inyeccion ?? 0).toBe(0)

  await expect.poll(() => pasosResponse?.length ?? 0).toBe(51)
  expect(Math.abs((pasosResponse?.[0].total_poblacion ?? 0) - (pasosResponse?.[50].total_poblacion ?? -1))).toBeLessThan(0.1)

  await page.getByRole('button', { name: /iniciar/i }).click()
  await expect(page.getByTestId('stats-total-population')).toContainText('10,000')

  for (let i = 0; i < 5; i += 1) {
    await page.waitForTimeout(600)
    await expect(page.getByTestId('stats-total-population')).toContainText('10,000')
  }

  const finalStep = pasosResponse?.[50]
  expect(finalStep).toBeTruthy()
  const nearPoi = finalStep!.densidad[POI_ROW][POI_COL]
  const farFromPoi = finalStep!.densidad[0][0]
  const mooreNeighbour = finalStep!.densidad[POI_ROW + 1][POI_COL + 1]

  expect(nearPoi).toBeGreaterThan(farFromPoi * 2)
  expect(mooreNeighbour).toBeGreaterThan(farFromPoi)

  const heatmapPixel = await page.locator('[data-testid="simulation-heatmap-canvas"]').evaluate((canvasElement) => {
    const canvas = canvasElement as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    const center = ctx.getImageData(11, 8, 1, 1).data
    const corner = ctx.getImageData(0, 0, 1, 1).data
    return { centerAlpha: center[3], cornerAlpha: corner[3] }
  })

  expect(heatmapPixel.centerAlpha).toBeGreaterThan(heatmapPixel.cornerAlpha)
})
