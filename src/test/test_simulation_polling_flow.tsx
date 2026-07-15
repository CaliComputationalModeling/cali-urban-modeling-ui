import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useSimulationStore } from '@/store/simulationStore'
import type { PasoSimulacionDTO } from '@/services/endpoints/simulation.endpoints'

const makeObservationBackend = (
  id: number,
  ubicacion_wkt: string,
  factores_detectados: Record<string, string | number | boolean>,
  tags: string[] = [],
) => ({
  id,
  usuario_id: 1,
  ubicacion_wkt,
  fecha_observacion: '2026-07-11T00:00:00Z',
  fecha_registro: '2026-07-11T00:00:00Z',
  tipo_observacion: 'Avistamiento' as const,
  descripcion: null,
  numero_personas: 1,
  estado_animo: null,
  factores_detectados,
  tags,
  estado: 'Activo' as const,
})

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
  http.post('*/api/simulaciones/ejecutar', async () =>
    HttpResponse.json(
      { ejecucion_id: 123, estado: 'pendiente', progreso: 0, mensaje: 'Aceptada' },
      { status: 202 },
    ),
  ),
  http.get('*/api/simulaciones/123/estado', () => {
    statusCalls += 1

    if (statusCalls === 1) {
      return HttpResponse.json({ ejecucion_id: 123, estado: 'en_proceso', progreso: 20, pasos_listos: 10 })
    }

    return HttpResponse.json({ ejecucion_id: 123, estado: 'finalizado', progreso: 100, total_pasos: 50 })
  }),
  http.get('*/api/simulaciones/123/pasos', () => HttpResponse.json(loadedSteps)),
  http.get('*/observations', () => HttpResponse.json([])),
  http.get('*/api/atractores-fisicos', () => HttpResponse.json([])),
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

  it('derives urban distribution indicators from POIs and repulsive attractors', async () => {
    server.use(
      http.get('*/observations', () =>
        HttpResponse.json([
          makeObservationBackend(1, 'POINT (-76.525 3.45)', { tipo_poi: 'comedor_social', radio_influencia: 0 }, ['Alimentación']),
          makeObservationBackend(2, 'POINT (-76.525 3.55)', { tipo_poi: 'cambuche', radio_influencia: 0 }, ['Refugio Imprevisto']),
          makeObservationBackend(3, 'POINT (-76.475 3.55)', { tipo_poi: 'zona_consumo', radio_influencia: 0 }, ['Drogas']),
        ]),
      ),
      http.get('*/api/atractores-fisicos', () =>
        HttpResponse.json([
          {
            id: 9,
            tipo: 'residuos',
            lat: 3.35,
            lon: -76.475,
            intensidad: 1,
            radio_influencia: 0,
            descripcion: null,
            activo: true,
          },
        ]),
      ),
    )

    useSimulationStore.setState({
      loadedPasos: [
        {
          tiempo: 1,
          total_poblacion: 80,
          densidad: [
            [10, 0, 5],
            [0, 20, 0],
            [0, 15, 30],
          ],
          atractivo: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
        },
      ],
      history: [],
      urbanState: null,
      currentGeneration: 0,
      status: 'idle',
    })

    await act(async () => {
      await useSimulationStore.getState().stepSimulation()
    })

    expect(useSimulationStore.getState().urbanState).toMatchObject({
      en_transito: 10,
      en_comedor: 20,
      en_cambuche: 15,
      zona_consumo: 30,
      zona_repulsora: 5,
    })

    expect(useSimulationStore.getState().history[0]).toMatchObject({
      en_transito: 10,
      en_comedor: 20,
      en_cambuche: 15,
      zona_consumo: 30,
      zona_repulsora: 5,
    })
  })
})
