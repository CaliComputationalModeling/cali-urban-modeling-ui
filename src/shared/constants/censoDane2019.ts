/**
 * Datos del Censo DANE 2019 - Habitantes de calle en Cali
 * Sección 10.1 del informe: Distribución por comuna
 *
 * Total: 4.749 personas
 *
 * Nota: Las comunas 1, 5, 11, 12, 16, 17, 21 y 22 tienen menos de 30
 * entrevistas directas, por lo que su margen de error es mayor.
 */

export const POBLACION_CENSO_DANE_2019: Record<number, number> = {
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

export const TOTAL_POBLACION_CENSO = Object.values(POBLACION_CENSO_DANE_2019).reduce(
  (sum, val) => sum + val,
  0,
)

/**
 * Top 5 comunas con mayor población (65.9% del total)
 * Usado para validación de concentración espacial
 */
export const TOP_5_COMUNAS = [3, 9, 10, 4, 19] as const
