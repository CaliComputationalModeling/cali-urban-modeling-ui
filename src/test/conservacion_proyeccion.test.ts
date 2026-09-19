import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useSimulationStore } from '@/store/simulationStore'
import { distribucionPorComuna, proyectarTotal } from '@/shared/domain/moduloDemografico'
import type { PasoSimulacionDTO } from '@/services/endpoints/simulation.endpoints'

/**
 * Prueba de aceptación 3 (sección 5 del requerimiento):
 * "Para cualquier año proyectado, la ejecución espacial resultante conserva
 * EXACTAMENTE el total de población de entrada de ese año — la prueba de
 * conservación ya validada, aplicada al nuevo total, no solo a 4.749."
 *
 * La conservación intrínseca la garantiza el motor AC (validado en backend).
 * Aquí se verifica la CADENA COMPLETA en el frontend:
 *   módulo demográfico (2024, escenario medio → 5.232)
 *   → distribución por comuna (suma exacta)
 *   → `poblacion_inicial_por_comuna` enviado al backend en la re-siembra
 *   → `total_agentes` resultante == total proyectado de entrada.
 */

const TOTAL_PROYECTADO = Math.round(proyectarTotal(2024, 'medio'))
const DISTRIBUCION = distribucionPorComuna(2024, 'medio').porComuna

const makeStep = (tiempo: number): PasoSimulacionDTO => ({
  tiempo,
  total_poblacion: TOTAL_PROYECTADO,
  densidad: [
    [0.1 + tiempo * 0.001, 0.2],
    [0.3, 0.4],
  ],
  atractivo: [
    [0.2, 0.3],
    [0.4, 0.5],
  ],
})

const loadedSteps = Array.from({ length: 20 }, (_, index) => makeStep(index))

let capturedPayload: Record<string, unknown> | null = null
let statusCalls = 0

const server = setupServer(
  http.post('*/api/simulaciones/ejecutar', async ({ request }) => {
    capturedPayload = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      { ejecucion_id: 4242, estado: 'pendiente', progreso: 0, mensaje: 'Aceptada' },
      { status: 202 },
    )
  }),
  http.get('*/api/simulaciones/4242/estado', () => {
    statusCalls += 1
    return statusCalls === 1
      ? HttpResponse.json({ ejecucion_id: 4242, estado: 'en_proceso', progreso: 50 })
      : HttpResponse.json({ ejecucion_id: 4242, estado: 'finalizado', progreso: 100, total_pasos: 20 })
  }),
  http.get('*/api/simulaciones/4242/pasos', () => HttpResponse.json(loadedSteps)),
  http.get('*/observations', () => HttpResponse.json([])),
  http.get('*/api/atractores-fisicos', () => HttpResponse.json([])),
)

describe('conservación con total proyectado distinto de 4.749 (2024, escenario medio)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    capturedPayload = null
    statusCalls = 0
    useSimulationStore.getState().disconnect()
  })

  afterEach(() => {
    useSimulationStore.getState().disconnect()
    server.resetHandlers()
    vi.useRealTimers()
  })

  afterAll(() => server.close())

  it('la distribución por comuna del 2024 (medio) suma EXACTA al total proyectado', () => {
    const suma = Object.values(DISTRIBUCION).reduce((acc, v) => acc + v, 0)
    expect(TOTAL_PROYECTADO).toBe(5232)
    expect(suma).toBe(TOTAL_PROYECTADO)
  })

  it('la re-siembra envía ese total como población inicial y la simulación lo conserva', async () => {
    await act(async () => {
      await useSimulationStore.getState().startAsyncSimulation({
        version_escenario_id: 1,
        generaciones: 20,
        radio_suavizado: 1,
        movilidad: 0.25,
        permanencia_base: 0.1,
        sensibilidad_atractivo: 1,
        poblacion_inicial_por_comuna: DISTRIBUCION,
      })
    })

    expect(capturedPayload).not.toBeNull()
    const poblacionEnviada = (capturedPayload?.poblacion_inicial_por_comuna ?? {}) as Record<string, number>
    const sumaEnviada = Object.values(poblacionEnviada).reduce((acc, v) => acc + Number(v), 0)
    expect(sumaEnviada).toBe(TOTAL_PROYECTADO)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(useSimulationStore.getState().loadedPasos).toHaveLength(20)

    await act(async () => {
      await useSimulationStore.getState().stepSimulation()
    })

    const geojson = useSimulationStore.getState().geojson
    expect(geojson?.metadata.total_agentes).toBe(TOTAL_PROYECTADO)
    expect(useSimulationStore.getState().urbanState?.total_agentes).toBe(TOTAL_PROYECTADO)
  })

  it('cambiar el escenario actualiza el total proyectado (aceptación 4)', () => {
    const bajo = Math.round(proyectarTotal(2024, 'bajo'))
    const alto = Math.round(proyectarTotal(2024, 'alto'))
    expect(bajo).toBe(5152)
    expect(alto).toBe(5755)
    expect(bajo).toBeLessThan(TOTAL_PROYECTADO)
    expect(alto).toBeGreaterThan(TOTAL_PROYECTADO)

    const distBajo = distribucionPorComuna(2024, 'bajo').porComuna
    const distAlto = distribucionPorComuna(2024, 'alto').porComuna
    const sumaBajo = Object.values(distBajo).reduce((acc, v) => acc + v, 0)
    const sumaAlto = Object.values(distAlto).reduce((acc, v) => acc + v, 0)
    expect(sumaBajo).toBe(bajo)
    expect(sumaAlto).toBe(alto)
  })
})
