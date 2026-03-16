/**
 * Configuración de variables de entorno
 * Centraliza el acceso a variables de entorno de Vite
 */

/**
 * Obtiene la URL base de la API desde las variables de entorno
 * Fallback a http://localhost:3000 si no está definida
 */
export function getApiUrl(): string {
  try {
    // @ts-ignore - Vite env types
    const url = import.meta.env?.VITE_API_URL
    return url || 'http://localhost:3000'
  } catch {
    return 'http://localhost:3000'
  }
}

/**
 * Obtiene el modo de la aplicación (production o development)
 */
export function isProduction(): boolean {
  try {
    // @ts-ignore - Vite env types
    return import.meta.env?.PROD === true
  } catch {
    return false
  }
}
