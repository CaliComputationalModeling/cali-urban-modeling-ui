/**
 * HTTP Services - Index
 * 
 * Exporta el cliente HTTP y sus configuraciones
 */

export { createHttpClient, getHttpClient, httpClient } from './httpClient'
export type { HttpRequestConfig, HttpResponse } from './httpClient'
export { setupHttpInterceptors } from './interceptors'
