import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useSimulationStore } from '@/store/simulationStore'
import type { PasoSimulacionDTO } from '@/services/endpoints/simulation.endpoints'

const API_BASE = 'http://localhost:8000'

const makeStep = (tiempo: number, total = 10_000): PasoSimulacionDTO => ({
  tiempo,
  total_poblacion: total,
  densidad: [
    [0.1 + tiempo * 0.001, 0.2],
    [0.3, 0.4],
  ],
  atractivo: [
    [0.2, 0.3],
    [0.4, 0.5],
  ],
})

const loadedSteps = Array.from({ length: 50 }, (_, index) => makeStep(index))

let statusCalls = 0

const server = setupServer(
  http.post(`${API_BASE}/api/simulaciones/ejecutar`, async () =>
    HttpResponse.json(
      { ejecucion_id: 123, estado: 'pendiente', progreso: 0, mensaje: 'Aceptada' },
      { status: 202 },
    ),
  ),
  http.get(`${API_BASE}/api/simulaciones/123/estado`, () => {
    statusCalls += 1

    if (statusCalls === 1) {
      return HttpResponse.json({ ejecucion_id: 123, estado: 'en_proceso', progreso: 20, pasos_listos: 10 })
    }

    return HttpResponse.json({ ejecucion_id: 123, estado: 'finalizado', progreso: 100, total_pasos: 50 })
  }),
  http.get(`${API_BASE}/api/simulaciones/123/pasos`, () => HttpResponse.json(loadedSteps)),
)

describe('simulation async polling flow', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    statusCalls = 0
    useSimulationStore.getState().disconnect()
  })

  afterEach(() => {
    useSimulationStore.getState().disconnect()
    server.resetHandlers()
    vi.useRealTimers()
  })

  afterAll(() => server.close())

  it('handles HTTP 202, polls status, loads pasos once finalized and clears loading state', async () => {
    await act(async () => {
      await useSimulationStore.getState().startAsyncSimulation({
        version_escenario_id: 1,
        generaciones: 50,
        radio_suavizado: 1,
        movilidad: 0.25,
        permanencia_base: 0.1,
        sensibilidad_atractivo: 1,
      })
    })

    expect(useSimulationStore.getState()).toMatchObject({
      ejecucionId: '123',
      loadedPasos: [],
      pollingStatus: 'Aceptada',
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(statusCalls).toBe(1)
    expect(useSimulationStore.getState().simulationProgress?.estado).toBe('en_proceso')
    expect(useSimulationStore.getState().loadedPasos).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    const state = useSimulationStore.getState()
    expect(statusCalls).toBe(2)
    expect(state.pollingStatus).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.backendConnected).toBe(true)
    expect(state.maxGenerations).toBe(50)
    expect(state.simulationProgress).toMatchObject({ estado: 'finalizado', progreso: 100, total_pasos: 50 })
  })
})
