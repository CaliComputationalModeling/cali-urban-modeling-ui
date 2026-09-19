/**
 * Módulo demográfico temporal — "cuántos son" (total de población por año).
 *
 * Espejo TypeScript del módulo de backend `app/domain/services/modulo_demografico.py`.
 * Ambos deben permanecer en sincronía (se verifican por tests en cada lado).
 *
 * SEPARACIÓN DE CONCERNES (principio de arquitectura):
 *   - Este módulo responde "cuántos habitantes de calle hay en total en Cali
 *     en un año dado" (lineal / exponencial / acelerado).
 *   - El módulo espacial (motor AC ya validado) responde "dónde están" y NO se
 *     toca.  La conexión es por RE-SIEMBRA periódica: para cada año se toma el
 *     total proyectado aquí + la distribución por comuna (supuesto de la
 *     sección 3) y se inyecta como `poblacion_inicial_por_comuna` en una
 *     ejecución espacial nueva.  El crecimiento ocurre ENTRE ejecuciones.
 *
 * CALIBRACIÓN (dos censos reales DANE):
 *   - 2005 → 3.620 personas
 *   - 2019 → 4.749 personas  (intervalo = 14 años)
 *
 *   Lineal:     m = (4.749 − 3.620) / 14 ≈ 80.64 personas/año → P(2024) ≈ 5.152
 *   Exponencial: r = (4.749 / 3.620)^(1/14) − 1 ≈ 0.01958 → P(2024) ≈ 5.232
 *
 * ADVERTENCIA OBLIGATORIA: la calibración usa únicamente DOS observaciones
 * separadas por 14 años que incluyen la pandemia COVID-19 (2020–2022).  Los
 * años 2020–2024 son una EXTRAPOLACIÓN ESPECULATIVA, no una predicción
 * validada, y deben presentarse como RANGO (bajo/medio/alto), nunca como un
 * número único.
 *
 * EXTENSIBILIDAD: el módulo es data-driven.  Para incorporar un futuro censo
 * real basta añadir observaciones a `OBSERVACIONES_POBLACION` (y, si se
 * dispone de distribución por comuna real, a `DISTRIBUCION_COMUNA_POR_ANIO`).
 */

export type EscenarioProyeccion = 'bajo' | 'medio' | 'alto'

export interface ObservacionPoblacion {
  anio: number
  total: number
}

export interface PuntoSerieAnual {
  anio: number
  total: number
  es_anio_censo: boolean
}

// ─── Datos históricos (fuente única del modelo en frontend) ────────────────

export const OBSERVACIONES_POBLACION: ObservacionPoblacion[] = [
  { anio: 2005, total: 3620 },
  { anio: 2019, total: 4749 },
]

/** Distribución del censo DANE 2019 por comuna (sección 10.1 del informe). */
export const DISTRIBUCION_COMUNA_CENSO_2019: Record<number, number> = {
  1: 30,
  2: 211,
  3: 1269,
  4: 394,
  5: 28,
  6: 140,
  7: 58,
  8: 212,
  9: 655,
  10: 509,
  11: 46,
  12: 50,
  13: 163,
  14: 161,
  15: 93,
  16: 45,
  17: 49,
  18: 180,
  19: 304,
  20: 129,
  21: 16,
  22: 7,
}

/**
 * SOBRESCRIBIR el supuesto de distribución por comuna cuando existan datos
 * reales para un año específico (sección 3.2).  Formato: { anio: { comuna: hab } }.
 */
export const DISTRIBUCION_COMUNA_POR_ANIO: Record<number, Record<number, number>> = {}

export const TOP_COMUNAS: readonly number[] = [3, 9, 10, 4, 19]

export const ANIO_MINIMO = 2005
export const ANIO_MAXIMO = 2024

/** Aceleración del escenario ALTO sobre la tasa anual del último censo. */
export const FACTOR_ACELERACION_POST_PANDEMIA = 2.0

export const ESCENARIOS: ReadonlyArray<{ id: EscenarioProyeccion; nombre: string; descripcion: string }> = [
  {
    id: 'bajo',
    nombre: 'Bajo',
    descripcion: 'Modelo lineal (incremento constante ≈ 80.6 personas/año). Más conservador.',
  },
  {
    id: 'medio',
    nombre: 'Medio',
    descripcion: 'Modelo exponencial calibrado (r ≈ 1.96 %/año). Por defecto.',
  },
  {
    id: 'alto',
    nombre: 'Alto',
    descripcion: 'Exponencial con aceleración post-pandemia (tasa duplicada desde 2019).',
  },
]

// ─── Textos obligatorios (documentados en código y visibles en la UI) ──────

export const ADVERTENCIA_INCERTIDUMBRE =
  'ADVERTENCIA DE INCERTIDUMBRE: esta proyección se calibra con ÚNICAMENTE dos censos reales (2005 y 2019), separados por 14 años que incluyen la pandemia de COVID-19 (2020–2022). Ningún modelo de crecimiento suave (lineal o exponencial) puede capturar un evento de ese impacto. Los años sin censo real (2020–2024) son una EXTRAPOLACIÓN ESPECULATIVA, no una predicción validada, y se muestran como rango de escenarios.'

export const SUPUESTO_DISTRIBUCION_COMUNA =
  'SUPUESTO (no verificado): no existe información de distribución por comuna para años previos a 2019. Se mantiene la proporción relativa por comuna del censo 2019 (comunas 3, 9, 10, 4 y 19 concentran el 65,9 % del total) y solo el total de la ciudad crece/decrece según el módulo demográfico. Este supuesto puede sobrescribirse por año con datos reales.'

export const JUSTIFICACION_ESCENARIO_ALTO =
  'Escenario ALTO: se aplica un ajuste adicional al modelo exponencial calibrado. Se supone que la tasa anual del período 2005–2019 (r ≈ 1,96 %/año) se duplica a ≈ 3,92 %/año en el período post-pandemia 2019–2024, reflejando un posible repunte por crisis económica post-COVID, migración y precarización urbana. Es un supuesto del modelador, no un dato.'

// ─── Calibración (funciones puras, data-driven) ────────────────────────────

function ordenarObservaciones(obs: ObservacionPoblacion[]): ObservacionPoblacion[] {
  return [...obs].sort((a, b) => a.anio - b.anio)
}

export function calibrarLineal(
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): { pendiente: number; intercepto: number } {
  const puntos = ordenarObservaciones(obs)
  if (puntos.length < 2) throw new Error('Se necesitan al menos 2 observaciones para calibrar')
  const n = puntos.length
  const sx = puntos.reduce((acc, o) => acc + o.anio, 0)
  const sy = puntos.reduce((acc, o) => acc + o.total, 0)
  const sxx = puntos.reduce((acc, o) => acc + o.anio * o.anio, 0)
  const sxy = puntos.reduce((acc, o) => acc + o.anio * o.total, 0)
  const denom = n * sxx - sx * sx
  if (Math.abs(denom) < 1e-12) throw new Error('Observaciones degeneradas: no se puede calibrar lineal')
  const pendiente = (n * sxy - sx * sy) / denom
  const intercepto = (sy - pendiente * sx) / n
  return { pendiente, intercepto }
}

export function calibrarExponencial(
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): { tasaAnual: number; poblacionBase: number; anioBase: number; poblacionUltimoCenso: number } {
  const puntos = ordenarObservaciones(obs)
  if (puntos.length < 2) throw new Error('Se necesitan al menos 2 observaciones para calibrar')
  const n = puntos.length
  const sx = puntos.reduce((acc, o) => acc + o.anio, 0)
  const sy = puntos.reduce((acc, o) => acc + Math.log(o.total), 0)
  const sxx = puntos.reduce((acc, o) => acc + o.anio * o.anio, 0)
  const sxy = puntos.reduce((acc, o) => acc + o.anio * Math.log(o.total), 0)
  const denom = n * sxx - sx * sx
  if (Math.abs(denom) < 1e-12) throw new Error('Observaciones degeneradas: no se puede calibrar exponencial')
  const b = (n * sxy - sx * sy) / denom
  const tasaAnual = Math.exp(b) - 1
  return {
    tasaAnual,
    poblacionBase: puntos[0].total,
    anioBase: puntos[0].anio,
    poblacionUltimoCenso: puntos[puntos.length - 1].total,
  }
}

export function esAnioCenso(
  anio: number,
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): boolean {
  return obs.some((o) => o.anio === anio)
}

function totalExactoCenso(
  anio: number,
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): number | null {
  const obsEncontrada = obs.find((o) => o.anio === anio)
  return obsEncontrada ? obsEncontrada.total : null
}

function distribuirExacto(total: number, proporciones: Record<number, number>): Record<number, number> {
  const totalInt = Math.round(total)
  const claves = Object.keys(proporciones).map(Number)
  const salida: Record<number, number> = {}
  if (totalInt <= 0) {
    for (const k of claves) salida[k] = 0
    return salida
  }
  const suma = claves.reduce((acc, k) => acc + Math.max(0, proporciones[k]), 0)
  if (suma <= 0) {
    const base = claves.length ? Math.floor(totalInt / claves.length) : 0
    let resto = claves.length ? totalInt - base * claves.length : totalInt
    for (const k of claves) salida[k] = base
    let i = 0
    while (resto > 0) {
      salida[claves[i % claves.length]] += 1
      i += 1
      resto -= 1
    }
    return salida
  }

  const crudos: Record<number, number> = {}
  const fracciones: Record<number, { frac: number; key: number }> = {}
  let asignado = 0
  for (const k of claves) {
    const v = (totalInt * Math.max(0, proporciones[k])) / suma
    crudos[k] = v
    const piso = Math.floor(v)
    salida[k] = piso
    asignado += piso
    fracciones[k] = { frac: v - piso, key: k }
  }

  let faltante = totalInt - asignado
  if (faltante > 0) {
    const orden = claves.slice().sort((a, b) => fracciones[b].frac - fracciones[a].frac || a - b)
    let i = 0
    while (faltante > 0) {
      salida[orden[i % orden.length]] += 1
      i += 1
      faltante -= 1
    }
  } else if (faltante < 0) {
    let exceso = -faltante
    const orden = claves.slice().sort((a, b) => fracciones[a].frac - fracciones[b].frac || a - b)
    for (const k of orden) {
      if (exceso <= 0) break
      if (salida[k] > 0) {
        salida[k] -= 1
        exceso -= 1
      }
    }
  }
  return salida
}

// ─── API pública ───────────────────────────────────────────────────────────

export function proyectarTotal(
  anio: number,
  escenario: EscenarioProyeccion = 'medio',
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): number {
  const exacto = totalExactoCenso(anio, obs)
  if (exacto !== null) return exacto

  const puntos = ordenarObservaciones(obs)
  const anioBase = puntos[0].anio
  const poblacionBase = puntos[0].total
  const anioUltimoCenso = puntos[puntos.length - 1].anio
  const poblacionUltimoCenso = puntos[puntos.length - 1].total
  const { pendiente, intercepto } = calibrarLineal(obs)
  const { tasaAnual } = calibrarExponencial(obs)

  if (escenario === 'bajo') return pendiente * anio + intercepto
  if (escenario === 'medio') return poblacionBase * Math.pow(1 + tasaAnual, anio - anioBase)
  // alto
  if (anio <= anioUltimoCenso) return poblacionBase * Math.pow(1 + tasaAnual, anio - anioBase)
  const tasaAcelerada = tasaAnual * FACTOR_ACELERACION_POST_PANDEMIA
  return poblacionUltimoCenso * Math.pow(1 + tasaAcelerada, anio - anioUltimoCenso)
}

export function distribucionPorComuna(
  anio: number,
  escenario: EscenarioProyeccion = 'medio',
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): { porComuna: Record<number, number>; supuesto: string; total: number } {
  const total = Math.round(proyectarTotal(anio, escenario, obs))

  const baseReal = DISTRIBUCION_COMUNA_POR_ANIO[anio]
  let proporciones: Record<number, number>
  let supuesto: string
  if (baseReal) {
    proporciones = { ...baseReal }
    supuesto = `Datos reales de distribución por comuna registrados para ${anio} (DISTRIBUCION_COMUNA_POR_ANIO).`
  } else {
    proporciones = { ...DISTRIBUCION_COMUNA_CENSO_2019 }
    supuesto = SUPUESTO_DISTRIBUCION_COMUNA
  }

  return { porComuna: distribuirExacto(total, proporciones), supuesto, total }
}

/**
 * Re-siembra: reescala una distribución por comuna existente (p. ej. la
 * distribución final simulada del año anterior) a un nuevo total anual.
 * La suma del resultado es EXACTA al nuevo total.
 */
export function reescalarDistribucion(
  distribucion: Record<number, number>,
  nuevoTotal: number,
): Record<number, number> {
  return distribuirExacto(Math.round(nuevoTotal), distribucion)
}

export function proyeccionAnual(
  escenario: EscenarioProyeccion = 'medio',
  anioMin: number = ANIO_MINIMO,
  anioMax: number = ANIO_MAXIMO,
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): PuntoSerieAnual[] {
  const serie: PuntoSerieAnual[] = []
  for (let anio = anioMin; anio <= anioMax; anio += 1) {
    serie.push({
      anio,
      total: Math.round(proyectarTotal(anio, escenario, obs)),
      es_anio_censo: esAnioCenso(anio, obs),
    })
  }
  return serie
}

export interface ResumenCalibracion {
  observaciones: Array<{ anio: number; total: number }>
  modelos: {
    lineal: { pendientePersonasPorAnio: number; intercepto: number; proyeccion2024: number }
    exponencial: { tasaAnual: number; tasaAnualPorcentual: number; proyeccion2024: number }
  }
  escenarios2024: Record<EscenarioProyeccion, number>
}

export function resumenCalibracion(
  obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION,
): ResumenCalibracion {
  const { pendiente, intercepto } = calibrarLineal(obs)
  const { tasaAnual, poblacionBase, anioBase } = calibrarExponencial(obs)
  return {
    observaciones: ordenarObservaciones(obs).map((o) => ({ anio: o.anio, total: o.total })),
    modelos: {
      lineal: {
        pendientePersonasPorAnio: pendiente,
        intercepto,
        proyeccion2024: Math.round(pendiente * 2024 + intercepto),
      },
      exponencial: {
        tasaAnual,
        tasaAnualPorcentual: tasaAnual * 100,
        proyeccion2024: Math.round(poblacionBase * Math.pow(1 + tasaAnual, 2024 - anioBase)),
      },
    },
    escenarios2024: {
      bajo: Math.round(proyectarTotal(2024, 'bajo', obs)),
      medio: Math.round(proyectarTotal(2024, 'medio', obs)),
      alto: Math.round(proyectarTotal(2024, 'alto', obs)),
    },
  }
}

/** Rango 2024 en un solo objeto, para la UI. */
export function rangoProyeccion2024(obs: ObservacionPoblacion[] = OBSERVACIONES_POBLACION): Record<EscenarioProyeccion, number> {
  return {
    bajo: Math.round(proyectarTotal(2024, 'bajo', obs)),
    medio: Math.round(proyectarTotal(2024, 'medio', obs)),
    alto: Math.round(proyectarTotal(2024, 'alto', obs)),
  }
}
