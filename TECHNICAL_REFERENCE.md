# REFERENCIA TÉCNICA - ESTRUCTURA COMPLETA

## 📁 Árbol de Archivos Creados/Modificados

```
cali-urban-modeling-ui/
├── .env.local (ACTUALIZADO)
│   └── VITE_API_URL=http://localhost:8000
│
├── src/
│   ├── main.tsx (ACTUALIZADO)
│   │   └── setupHttpInterceptors() en mount
│   │
│   ├── services/
│   │   ├── http/ (NUEVO)
│   │   │   ├── httpClient.ts         [271 líneas]
│   │   │   │   ├── HttpClientImpl class
│   │   │   │   ├── HttpResponse<T> interface
│   │   │   │   ├── HttpError class
│   │   │   │   ├── Request/Response/Error interceptor types
│   │   │   │   ├── executeRequestInterceptors()
│   │   │   │   ├── executeResponseInterceptors()
│   │   │   │   ├── executeErrorInterceptors()
│   │   │   │   ├── get/post/put/patch/delete() methods
│   │   │   │   └── withTimeout(), executeWithRetry()
│   │   │   │
│   │   │   ├── interceptors.ts       [128 líneas]
│   │   │   │   ├── createLoggingInterceptor()
│   │   │   │   ├── createErrorHandlingInterceptor()
│   │   │   │   ├── createAuthInterceptor()
│   │   │   │   ├── createResponseNormalizerInterceptor()
│   │   │   │   └── setupHttpInterceptors() [PUBLIC]
│   │   │   │
│   │   │   └── index.ts             [Exports]
│   │   │
│   │   ├── domain/ (NUEVO)
│   │   │   ├── authService.ts        [146 líneas]
│   │   │   │   ├── login(credentials)
│   │   │   │   ├── register(userData)
│   │   │   │   ├── logout()
│   │   │   │   ├── getToken()
│   │   │   │   ├── isAuthenticated()
│   │   │   │   ├── decodeToken()
│   │   │   │   └── getCurrentUser()
│   │   │   │
│   │   │   ├── simulationService.ts  [156 líneas]
│   │   │   │   ├── createSimulation()
│   │   │   │   ├── listSimulations()
│   │   │   │   ├── getSimulation()
│   │   │   │   ├── runSimulationStep()
│   │   │   │   ├── getStatistics()
│   │   │   │   ├── exportAsGeoJSON()
│   │   │   │   ├── resetSimulation()
│   │   │   │   └── deleteSimulation()
│   │   │   │
│   │   │   ├── userService.ts        [89 líneas]
│   │   │   │   ├── getProfile()
│   │   │   │   ├── updateProfile()
│   │   │   │   ├── listUsers()
│   │   │   │   ├── getUserById()
│   │   │   │   └── deleteUser()
│   │   │   │
│   │   │   ├── observationService.ts [104 líneas]
│   │   │   │   ├── createObservation()
│   │   │   │   ├── listObservations()
│   │   │   │   ├── getObservation()
│   │   │   │   ├── updateObservation()
│   │   │   │   ├── deleteObservation()
│   │   │   │   └── getSimulationObservations()
│   │   │   │
│   │   │   └── index.ts              [Exports centralizados]
│   │   │
│   │   ├── simulationService.ts (ACTUALIZADO)
│   │   └── http.ts (DEPRECADO, usar /http/)
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── api.dtos.ts           [340+ líneas] NUEVO
│   │   │   │   ├── Enums
│   │   │   │   │   ├── RuleFormat
│   │   │   │   │   ├── NeighborhoodType
│   │   │   │   │   ├── BoundaryMode
│   │   │   │   │   └── SimulationStatusEnum
│   │   │   │   │
│   │   │   │   ├── Request DTOs
│   │   │   │   │   ├── RuleRequestDTO
│   │   │   │   │   ├── CellCreateDTO
│   │   │   │   │   ├── GridConfigDTO
│   │   │   │   │   ├── SimulationCreateRequestDTO
│   │   │   │   │   └── SimulationRunRequestDTO
│   │   │   │   │
│   │   │   │   ├── Response DTOs
│   │   │   │   │   ├── PositionDTO
│   │   │   │   │   ├── GeoCoordinateDTO
│   │   │   │   │   ├── CellDTO
│   │   │   │   │   ├── GridDTO
│   │   │   │   │   ├── RuleDTO
│   │   │   │   │   ├── SimulationResponseDTO
│   │   │   │   │   ├── SimulationRunResponseDTO
│   │   │   │   │   ├── SimulationStatisticsDTO
│   │   │   │   │   └── ApiErrorResponseDTO
│   │   │   │   │
│   │   │   │   └── Pagination
│   │   │   │       └── PaginatedSimulationsDTO
│   │   │   │
│   │   │   └── (otros tipos existentes)
│   │   │
│   │   └── hooks/
│   │       └── api.hooks.ts          [189 líneas] NUEVO
│   │           ├── useSimulation()    [Hook principal]
│   │           │   ├── currentSimulation
│   │           │   ├── simulations[]
│   │           │   ├── isLoading
│   │           │   ├── isRunning
│   │           │   ├── error
│   │           │   ├── logs[]
│   │           │   ├── loadSimulation()
│   │           │   ├── loadSimulations()
│   │           │   ├── createSimulation()
│   │           │   ├── runSimulation()
│   │           │   ├── resetSimulation()
│   │           │   ├── deleteSimulation()
│   │           │   ├── clearError()
│   │           │   └── clearLogs()
│   │           │
│   │           └── useAuth()           [Hook principal]
│   │               ├── user
│   │               ├── isAuthenticated
│   │               ├── isLoading
│   │               ├── error
│   │               ├── token
│   │               ├── login()
│   │               ├── logout()
│   │               ├── register()
│   │               ├── clearError()
│   │               ├── setUser()
│   │               ├── setToken()
│   │               └── restoreSession()
│   │
│   ├── store/
│   │   ├── authStore.ts              [ACTUALIZADO - 147 líneas]
│   │   │   └── useAuthStore()         [Zustand store]
│   │   │       ├── user state
│   │   │       ├── token state
│   │   │       ├── isAuthenticated
│   │   │       ├── isLoading
│   │   │       ├── error
│   │   │       ├── login action
│   │   │       ├── register action
│   │   │       ├── logout action
│   │   │       ├── setUser action
│   │   │       ├── setToken action
│   │   │       ├── clearError action
│   │   │       └── restoreSession action
│   │   │
│   │   └── simulationStore.ts        [ACTUALIZADO - 228 líneas]
│   │       └── useSimulationStore()   [Zustand store]
│   │           ├── currentSimulation state
│   │           ├── simulations[] state
│   │           ├── isRunning state
│   │           ├── isLoading state
│   │           ├── error state
│   │           ├── logs[] state
│   │           ├── loadSimulation action
│   │           ├── loadSimulations action
│   │           ├── createSimulation action
│   │           ├── runSimulation action
│   │           ├── resetSimulation action
│   │           ├── deleteSimulation action
│   │           ├── setCurrentSimulation action
│   │           ├── clearError action
│   │           ├── clearLogs action
│   │           └── addLog action
│   │
│   └── features/
│       ├── auth/
│       │   └── components/
│       │       └── LoginComponent.tsx [NUEVO - 175 líneas]
│       │           ├── Form validation
│       │           ├── useAuth hook usage
│       │           ├── Error/loading states
│       │           ├── Auto-redirect on auth
│       │           └── Styled UI
│       │
│       └── simulation/
│           └── components/
│               ├── SimulationFormComponent.tsx  [NUEVO - 315 líneas]
│               │   ├── Form fields
│               │   ├── Validation logic
│               │   ├── API integration
│               │   ├── Type-safe submission
│               │   └── Error handling
│               │
│               └── SimulationsListComponent.tsx [NUEVO - 200 líneas]
│                   ├── List with pagination
│                   ├── Delete functionality
│                   ├── Loading states
│                   ├── Error displays
│                   └── Status indicators
│
├── INTEGRATION_GUIDE.md        [NUEVO - Guía completa]
│   ├── Descripción de archivos
│   ├── Cómo usar
│   ├── Clean Code principles
│   ├── Testing
│   ├── Ejemplos
│   └── Mejores prácticas
│
├── ENDPOINT_VALIDATION.md      [NUEVO - Validación]
│   ├── Mapeo de endpoints
│   ├── Validation checklist
│   ├── Testing checklist
│   ├── Configuración dev
│   ├── Troubleshooting
│   └── Cobertura de endpoints
│
└── INTEGRATION_SUMMARY.md      [NUEVO - Resumen ejecutivo]
    ├── Objetivo logrado
    ├── Entregables
    ├── Arquitectura
    ├── Cobertura
    ├── Ejemplos de uso
    ├── Métricas
    └── Quality checklist
```

---

## 🔄 FLUJO DE DATOS

### Authentication Flow

```
LoginComponent
    ↓ (email, password)
useAuth hook
    ↓
authService.login()
    ↓
httpClient.post('/auth/login')
    ↓ (add Bearer token if exists)
requestInterceptor
    ↓
Backend API
    ↓
responseInterceptor
    ↓
errorInterceptor (if 401)
    ↓
useAuthStore.setUser()
    ↓
localStorage.setItem('auth_token')
    ↓
redirect to /dashboard
```

### Simulation Creation Flow

```
SimulationFormComponent
    ↓ (form data)
useSimulation hook
    ↓
simulationService.createSimulation()
    ↓
httpClient.post('/api/simulations')
    ↓ (add Bearer + requestInterceptor)
Backend API
    ↓
responseInterceptor
    ↓
useSimulationStore.createSimulation action
    ↓
setState(currentSimulation, simulations[])
    ↓
UI updates
```

---

## 📋 TIPO-MAPPING API ↔ FRONTEND

### Backend Python DTO → Frontend TypeScript

```python
# Backend (Python)
class SimulationCreateRequestDTO(BaseModel):
    name: str
    grid_config: GridConfigDTO
    rule: RuleRequestDTO
    initial_cells: Optional[List[CellCreateDTO]]
```

```typescript
// Frontend (TypeScript)
interface SimulationCreateRequestDTO {
  name: string
  description?: string
  grid_config: GridConfigDTO
  rule: RuleRequestDTO
  initial_cells?: CellCreateDTO[]
}
```

---

## 🔗 API ENDPOINTS INTEGRADOS

### Auth (3 endpoints)
- `POST /auth/login` ← `authService.login()`
- `POST /auth/register` ← `authService.register()`
- `POST /auth/logout` ← `authService.logout()`

### Simulations (9 endpoints)
- `POST /api/simulations` ← `simulationService.createSimulation()`
- `GET /api/simulations` ← `simulationService.listSimulations()`
- `GET /api/simulations/{id}` ← `simulationService.getSimulation()`
- `POST /api/simulations/{id}/run` ← `simulationService.runSimulationStep()`
- `GET /api/simulations/{id}/statistics` ← `simulationService.getStatistics()`
- `GET /api/simulations/{id}/geojson` ← `simulationService.exportAsGeoJSON()`
- `GET /api/simulations/{id}/heatmap-geojson` ← `simulationService.exportAsHeatmapGeoJSON()`
- `POST /api/simulations/{id}/reset` ← `simulationService.resetSimulation()`
- `DELETE /api/simulations/{id}` ← `simulationService.deleteSimulation()`

### Users (5 endpoints)
- `GET /users/me` ← `userService.getProfile()`
- `PUT /users/me` ← `userService.updateProfile()`
- `GET /users` ← `userService.listUsers()`
- `GET /users/{id}` ← `userService.getUserById()`
- `DELETE /users/{id}` ← `userService.deleteUser()`

### Observations (5 endpoints)
- `POST /observations` ← `observationService.createObservation()`
- `GET /observations` ← `observationService.listObservations()`
- `GET /observations/{id}` ← `observationService.getObservation()`
- `PUT /observations/{id}` ← `observationService.updateObservation()`
- `DELETE /observations/{id}` ← `observationService.deleteObservation()`

---

## 🧪 TESTING STRUCTURE (Listo para implementar)

```typescript
// src/services/__tests__/simulationService.test.ts
describe('SimulationService', () => {
  let mockHttpClient: jest.Mocked<HttpClientImpl>
  
  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      // ...
    }
  })

  it('should create simulation with correct DTO', async () => {
    mockHttpClient.post.mockResolvedValue({
      data: { simulation_id: '123' }
    })
    
    const result = await simulationService.createSimulation({
      name: 'Test',
      grid_config: { ... },
      rule: { ... }
    })
    
    expect(result.simulation_id).toBe('123')
  })
})
```

---

## 🚀 PERFORMANCE CONSIDERATIONS

### Caching Strategy (Futura)
```typescript
// Ejemplo de mejora futura
const simulationCache = new Map<string, SimulationResponseDTO>()

export async function getCachedSimulation(id: string) {
  if (simulationCache.has(id)) {
    return simulationCache.get(id)!
  }
  
  const sim = await simulationService.getSimulation(id)
  simulationCache.set(id, sim)
  return sim
}
```

### Request Debouncing (Futura)
```typescript
// Para búsquedas
const debouncedSearch = debounce(
  (query) => simulationService.listSimulations(10, 0),
  500
)
```

---

## 🔐 SECURITY FEATURES

✅ Implementadas:
- [x] JWT token storage (localStorage/sessionStorage)
- [x] Bearer token auto-injection
- [x] 401 auto-logout
- [x] CORS handling
- [x] Timeout protection
- [x] Request validation

⏳ Por implementar:
- [ ] CSRF token para forms
- [ ] Refresh token rotation
- [ ] Rate limiting client-side
- [ ] Secure cookie flags
- [ ] CSP headers validation

---

**Documento actualizado:** 2026-03-09  
**Versión:** 1.0  
**Status:** ✅ COMPLETADO
