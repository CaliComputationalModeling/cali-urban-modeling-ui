# GUÍA DE INTEGRACIÓN API-FRONTEND
## Cali Urban Modeling - Clean Code Integration

---

## ARCHIVOS CLAVE CREADOS

### 1. **HTTP Client Robusto**
```
src/services/http/
├── httpClient.ts      # Cliente HTTP con interceptores
├── interceptors.ts    # Request, response, error interceptors
└── index.ts          # Exports principales
```

**Features:**
- Autenticación JWT automática
- Reintentos con exponential backoff
- Timeout handling
- Interceptores extensibles
- Type-safe requests/responses

### 2. **Domain Services** (Type-Safe)
```
src/services/domain/
├── simulationService.ts    # Simulaciones
├── authService.ts          # Autenticación
├── userService.ts          # Usuarios
├── observationService.ts   # Observaciones
└── index.ts               # Exports
```

**Principios:**
- Single Responsibility
- Dependency Inversion
- Type-safe con DTOs

### 3. **DTOs Consistentes**
```
src/shared/types/
├── api.dtos.ts    # DTOs que mapean con backend
└── (otros tipos)
```

**Covers:**
- Request/Response types
- Enums consistency
- Error handling types

### 4. **Global State Management**
```
src/store/
├── authStore.ts       # Auth state + API sync
└── simulationStore.ts # Simulation state + API sync
```

**Usa:** Zustand + TypeScript

### 5. **Custom React Hooks**
```
src/shared/hooks/
└── api.hooks.ts  # useAuth(), useSimulation()
```

**Benefits:**
- Encapsula lógica de API
- Reutilizable en componentes
- Error handling consistente

### 6. **Componentes de Ejemplo**
```
src/features/
├── auth/components/LoginComponent.tsx
├── simulation/components/
│   ├── SimulationFormComponent.tsx
│   └── SimulationsListComponent.tsx
```

---

## CÓMO USAR

### 1. **Autenticación**

```typescript
import { useAuth } from '@/shared/hooks/api.hooks'

function LoginPage() {
  const { login, isLoading, error } = useAuth()

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login(email, password)
      // Redirigir a dashboard
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit(email, password)
    }}>
      {/* Form fields */}
    </form>
  )
}
```

### 2. **Crear Simulación**

```typescript
import { useSimulation } from '@/shared/hooks/api.hooks'
import type { SimulationCreateRequestDTO } from '@/shared/types/api.dtos'

function CreateSimulationPage() {
  const { createSimulation, isLoading, error } = useSimulation()

  const handleCreate = async (config: SimulationCreateRequestDTO) => {
    try {
      const simulation = await createSimulation(config)
      console.log('Created:', simulation.simulation_id)
    } catch (err) {
      console.error('Failed:', err)
    }
  }

  return (
    // Form that calls handleCreate
  )
}
```

### 3. **Listar Simulaciones**

```typescript
import { useSimulation } from '@/shared/hooks/api.hooks'
import { useEffect } from 'react'

function SimulationsPage() {
  const { simulations, isLoading, loadSimulations } = useSimulation()

  useEffect(() => {
    loadSimulations(10, 0) // limit=10, offset=0
  }, [])

  return (
    <div>
      {simulations.map((sim) => (
        <div key={sim.simulation_id}>
          <h3>{sim.name}</h3>
          <p>Generation: {sim.generation}</p>
          <p>Alive cells: {sim.grid.alive_cells}</p>
        </div>
      ))}
    </div>
  )
}
```

### 4. **Ejecutar Simulación**

```typescript
import { useSimulation } from '@/shared/hooks/api.hooks'

function SimulationExecutor() {
  const { currentSimulation, runSimulation, isRunning } = useSimulation()

  const handleRun = async () => {
    try {
      await runSimulation(10) // 10 generations
    } catch (err) {
      console.error('Execution failed:', err)
    }
  }

  return (
    <button onClick={handleRun} disabled={isRunning || !currentSimulation}>
      {isRunning ? 'Running...' : 'Run'}
    </button>
  )
}
```

---

## CLEAN CODE PRINCIPLES APLICADOS

### 1. **Single Responsibility Principle**
- Cada servicio es responsable de un dominio
- Cada componente tiene una responsabilidad clara
- Separación entre servicios, stores y UI

### 2. **Dependency Inversion**
- Servicios no se conocen entre sí
- HTTP client abstraído
- Fácil de testear mockear

### 3. **Type Safety**
- TypeScript strict mode
- DTOs que mapean exactamente con API
- No `any` types sin justificación

### 4. **Error Handling**
- Interceptor centralizado de errores
- Manejo consistente en toda la app
- Logging automático

### 5. **Separation of Concerns**
- HTTP layer (httpClient)
- Domain layer (services)
- State layer (stores)
- UI layer (components)

### 6. **DRY (Don't Repeat Yourself)**
- Hooks reutilizables
- Servicios centralizados
- Tipos definidos una sola vez

---

## ENV CONFIGURATION

`.env.local`:
```
VITE_API_URL=http://localhost:8000
```

---

## ARQUITECTURA VISUAL

```
┌─────────────────────────────────────────────────────┐
│            React Components (UI Layer)               │
│     LoginComponent, SimulationForm, SimulationsList  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│         Custom Hooks (Integration Layer)            │
│      useAuth(), useSimulation()                     │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│         Zustand Stores (State Layer)                │
│    authStore, simulationStore                       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│      Domain Services (Business Logic Layer)         │
│  authService, simulationService, userService...    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│    HTTP Client + Interceptors (Network Layer)      │
│   Auth, Logging, Error Handling, Retries           │
└──────────────────┬──────────────────────────────────┘
                   │
            ┌──────▼──────────┐
            │  Backend API    │
            │  (Python/FastAPI)│
            └─────────────────┘
```

---

## MEJORES PRÁCTICAS

### ✅ DO's

1. **Usar los custom hooks** en componentes:
   ```typescript
   const { data, isLoading, error } = useSimulation()
   ```

2. **Dejar que el store maneje la sincronización** con API:
   ```typescript
   // ❌ NO: Llamar servicio directamente
   const result = await simulationService.getSimulation(id)
   
   // ✅ YES: Usar store
   const { loadSimulation } = useSimulation()
   await loadSimulation(id)
   ```

3. **Validar en componentes**, lógica en servicios
4. **Usar DTOs** para type safety
5. **Aprovechar interceptores** para cross-cutting concerns

### ❌ DON'Ts

1. **NO llamar servicios directamente** desde componentes
2. **NO mezclar lógica** entre componentes y servicios
3. **NO ignorar errores** de API
4. **NO usar `any`** sin justificación
5. **NO duplication** de código de fetch/error handling

---

## TESTING

Estructura para tests (ejemplo):

```typescript
// src/services/__tests__/simulationService.test.ts
import { simulationService } from '../domain/simulationService'
import { getHttpClient } from '../http'

jest.mock('../http')

describe('SimulationService', () => {
  it('should create simulation', async () => {
    const mockHttp = getHttpClient as jest.Mock
    mockHttp.post.mockResolvedValue({
      data: { simulation_id: '123', name: 'Test' }
    })
    
    const result = await simulationService.createSimulation({...})
    expect(result.simulation_id).toBe('123')
  })
})
```

---

## PRÓXIMOS PASOS

1. ✅ HTTP Client robusto
2. ✅ Domain services tipados
3. ✅ Zustand stores
4. ✅ Componentes de ejemplo
5. ⏳ **Tests unitarios** para servicios
6. ⏳ **Tests E2E** para flujos críticos
7. ⏳ **Documentación OpenAPI** de API
8. ⏳ **Error boundaries** en componentes
9. ⏳ **Loading skeletons** para UX
10. ⏳ **Caché estratégico** de datos

---

## SOPORTE

Si necesitas agregar un nuevo servicio o endpoint:

1. **Crea el servicio** en `src/services/domain/`
2. **Define DTOs** en `src/shared/types/api.dtos.ts`
3. **Exporta desde** `src/services/domain/index.ts`
4. **Usa en componentes** vía custom hooks si es necesario

Ejemplo:
```typescript
// src/services/domain/reportsService.ts
class ReportsServiceImpl {
  async generateReport(simulationId: string) {
    const client = getHttpClient()
    const response = await client.post(`/reports`, { simulation_id: simulationId })
    return response.data
  }
}

export const reportsService = new ReportsServiceImpl()
```

---

**Versión:** 1.0  
**Actualizado:** 2026-03-09  
**Escrito para:** Clean Code + Type Safety
