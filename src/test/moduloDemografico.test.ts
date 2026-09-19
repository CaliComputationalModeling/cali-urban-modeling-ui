import { describe, expect, it } from 'vitest'
import {
  ADVERTENCIA_INCERTIDUMBRE,
  DISTRIBUCION_COMUNA_CENSO_2019,
  DISTRIBUCION_COMUNA_POR_ANIO,
  SUPUESTO_DISTRIBUCION_COMUNA,
  distribucionPorComuna,
  esAnioCenso,
  proyectarTotal,
  proyeccionAnual,
  reescalarDistribucion,
  resumenCalibracion,
  rangoProyeccion2024,
} from '@/shared/domain/moduloDemografico'

describe('módulo demográfico — reproducción exacta de censos reales (aceptación 1)', () => {
  it.each(['bajo', 'medio', 'alto'] as const)(
    'reproduce 3.620 (2005) y 4.749 (2019) en el escenario %s',
    (escenario) => {
      expect(proyectarTotal(2005, escenario)).toBe(3620)
      expect(proyectarTotal(2019, escenario)).toBe(4749)
    },
  )

  it('marca los años censo', () => {
    expect(esAnioCenso(2005)).toBe(true)
    expect(esAnioCenso(2019)).toBe(true)
    expect(esAnioCenso(2024)).toBe(false)
    expect(esAnioCenso(2010)).toBe(false)
  })
})

describe('módulo demográfico — calibración lineal y exponencial (sección 2)', () => {
  it('lineal: pendiente ≈ 80.64 personas/año y pasa por ambos censos', () => {
    const { pendientePersonasPorAnio: pendiente, intercepto } = resumenCalibracion().modelos.lineal
    expect(pendiente).toBeCloseTo((4749 - 3620) / 14, 9)
    expect(pendiente * 2005 + intercepto).toBeCloseTo(3620, 6)
    expect(pendiente * 2019 + intercepto).toBeCloseTo(4749, 6)
  })

  it('exponencial: r ≈ 0.01958 (1.96 %/año)', () => {
    const { tasaAnual, tasaAnualPorcentual, proyeccion2024 } = resumenCalibracion().modelos.exponencial
    const rEsperado = (4749 / 3620) ** (1 / 14) - 1
    expect(tasaAnual).toBeCloseTo(rEsperado, 12)
    expect(tasaAnualPorcentual).toBeCloseTo(1.9579, 2)
    expect(proyeccion2024).toBe(5232)
  })

  it('ambos modelos proyectan 2024 y el lineal es más conservador', () => {
    const { lineal, exponencial } = resumenCalibracion().modelos
    expect(lineal.proyeccion2024).toBe(5152)
    expect(exponencial.proyeccion2024).toBe(5232)
    expect(lineal.proyeccion2024).toBeLessThan(exponencial.proyeccion2024)
  })
})

describe('módulo demográfico — 2024 como RANGO con advertencia (aceptación 2)', () => {
  it('entrega rango bajo/medio/alto ordenado', () => {
    const rango = rangoProyeccion2024()
    expect(rango.bajo).toBe(5152)
    expect(rango.medio).toBe(5232)
    expect(rango.alto).toBe(5755)
    expect(rango.bajo).toBeLessThan(rango.medio)
    expect(rango.medio).toBeLessThan(rango.alto)
  })

  it('documenta la advertencia de incertidumbre obligatoria', () => {
    expect(ADVERTENCIA_INCERTIDUMBRE).toContain('2005')
    expect(ADVERTENCIA_INCERTIDUMBRE).toContain('2019')
    expect(ADVERTENCIA_INCERTIDUMBRE.toLowerCase()).toContain('pandemia')
    expect(ADVERTENCIA_INCERTIDUMBRE.toLowerCase()).toContain('especulativa')
  })
})

describe('módulo demográfico — distribución por comuna (sección 3 y aceptación 3)', () => {
  it('la distribución del total 2024 (medio) suma EXACTA al total proyectado', () => {
    const { porComuna, total } = distribucionPorComuna(2024, 'medio')
    expect(total).toBe(5232)
    expect(Object.values(porComuna).reduce((acc, v) => acc + v, 0)).toBe(total)
  })

  it('usa las proporciones del censo 2019 como supuesto por defecto', () => {
    const { porComuna, supuesto } = distribucionPorComuna(2020, 'medio')
    const total = Object.values(porComuna).reduce((acc, v) => acc + v, 0)
    const totalCenso2019 = Object.values(DISTRIBUCION_COMUNA_CENSO_2019).reduce((acc, v) => acc + v, 0)
    const propComuna3 = DISTRIBUCION_COMUNA_CENSO_2019[3] / totalCenso2019
    expect(porComuna[3] / total).toBeCloseTo(propComuna3, 2)
    expect(supuesto).toContain(SUPUESTO_DISTRIBUCION_COMUNA)
  })

  it('para 2005 (sin datos por comuna) escala la proporción 2019 al total 3.620', () => {
    const { porComuna, total } = distribucionPorComuna(2005, 'medio')
    expect(total).toBe(3620)
    expect(Object.values(porComuna).reduce((acc, v) => acc + v, 0)).toBe(3620)
  })

  it('soporta sobrescribir la distribución por año con datos reales', () => {
    DISTRIBUCION_COMUNA_POR_ANIO[2015] = { 3: 3000, 9: 1000, 10: 500 }
    try {
      const { porComuna, supuesto, total } = distribucionPorComuna(2015, 'medio')
      expect(supuesto).toContain('DISTRIBUCION_COMUNA_POR_ANIO')
      expect(Object.values(porComuna).reduce((acc, v) => acc + v, 0)).toBe(total)
    } finally {
      delete DISTRIBUCION_COMUNA_POR_ANIO[2015]
    }
  })

  it('reescalarDistribucion conserva exactamente el nuevo total (re-siembra)', () => {
    const nueva = reescalarDistribucion({ 3: 1400, 9: 700, 10: 550 }, 5755)
    expect(Object.values(nueva).reduce((acc, v) => acc + v, 0)).toBe(5755)
  })
})

describe('módulo demográfico — serie anual y extensibilidad', () => {
  it('la serie anual contiene ambos censos exactos y el 2024 proyectado', () => {
    const serie = proyeccionAnual('medio')
    const porAnio = new Map(serie.map((p) => [p.anio, p]))
    expect(porAnio.get(2005)?.total).toBe(3620)
    expect(porAnio.get(2019)?.total).toBe(4749)
    expect(porAnio.get(2024)?.total).toBe(5232)
    const censos = serie.filter((p) => p.es_anio_censo).map((p) => p.anio)
    expect(censos).toEqual([2005, 2019])
  })

  it('incorpora futuros censos reales sin cambios de interfaz (recalibra)', () => {
    const obsConCenso2024 = [
      { anio: 2005, total: 3620 },
      { anio: 2019, total: 4749 },
      { anio: 2024, total: 5000 },
    ]
    expect(proyectarTotal(2024, 'medio', obsConCenso2024)).toBe(5000)
    const { pendientePersonasPorAnio: pendiente } = resumenCalibracion(obsConCenso2024).modelos.lineal
    expect(pendiente).toBeGreaterThan(0)
  })
})
