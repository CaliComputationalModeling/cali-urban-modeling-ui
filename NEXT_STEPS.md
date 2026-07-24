# PLAN DE ACCIÓN - PRÓXIMOS PASOS

## 📌 FASE ACTUAL: INTEGRACIÓN COMPLETADA ✅

Se ha completado una integración profunda y profesional siguiente Clean Code principles. Ahora es momento de consolidar y mejorar.

---

## 🎯 RECOMENDACIONES INMEDIATAS (1-2 semanas)

### 1. **Test Unitarios** [PRIORIDAD: ALTA]

```bash
# Instalar dependencias
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Crear tests para services
src/services/__tests__/
├── authService.test.ts
├── simulationService.test.ts
├── userService.test.ts
└── observationService.test.ts
```

**Ejemplo:**
```typescript
// src/services/__tests__/authService.test.ts
import { authService } from '../domain/authService'
import { getHttpClient } from '../http'

jest.mock('../http')

describe('AuthService', () => {
  it('should login successfully', async () => {
    const mockHttp = getHttpClient as jest.Mock
    mockHttp.post.mockResolvedValue({
      data: { message: 'Login exitoso', rol: 1, access_token: 'token123' }
    })
    
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password'
    })
    
    expect(mockHttp.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.anything()
    )
  })
})
```

### 2. **Tests E2E** [PRIORIDAD: ALTA]

```bash
# Instalar Cypress
npm install --save-dev cypress

# Crear specs
cypress/e2e/
├── auth.cy.ts           # Login, register, logout
├── simulation.cy.ts     # Create, run, delete
└── navigation.cy.ts     # Full user journey
```

**Ejemplo:**
```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  it('should login and redirect to dashboard', () => {
    cy.visit('http://localhost:5173/login')
    cy.get('input[name=email]').type('test@example.com')
    cy.get('input[name=password]').type('password')
    cy.get('button[type=submit]').click()
    cy.url().should('include', '/dashboard')
  })
})
```

### 3. **Componentes Faltantes** [PRIORIDAD: MEDIA]

```
src/features/
├── auth/
│   ├── components/
│   │   └── LoginComponent.tsx ✅
│   └── pages/
│       └── LoginPage.tsx (FALTA - wrapper)
│
├── dashboard/
│   └── DashboardPage.tsx
│       └── Usar useSimulation hook ← FALTA
│
├── simulation/
│   ├── components/
│   │   ├── SimulationFormComponent.tsx ✅
│   │   ├── SimulationsListComponent.tsx ✅
│   │   ├── SimulationViewer.tsx (FALTA - mostrar grid)
│   │   └── ExecutionPanel.tsx (FALTA - run/pause/step)
│   └── pages/
│       ├── ExecutionPanelPage.tsx ← ACTUALIZAR
│       └── RulesEditorPage.tsx ← ACTUALIZAR
│
├── observations/
│   └── components/
│       └── ObservationForm.tsx (FALTA - usar observationService)
│
└── users/
    └── components/
        └── UserManagement.tsx (FALTA - usar userService)
```

### 4. **Error Boundaries** [PRIORIDAD: MEDIA]

```typescript
// src/shared/components/ErrorBoundary.tsx
import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        // Mostrar UI de error
      )
    }

    return this.props.children
  }
}
```

---

## 📚 MEJORAS DE DOCUMENTACIÓN [PRIORIDAD: MEDIA]

### 1. **API Documentation (OpenAPI)**
```bash
# Backend: Generar Swagger docs
# http://localhost:8000/docs
# VERIFICAR que existe
```

### 2. **Storybook para Componentes**
```bash
npm install --save-dev @storybook/react
npx storybook@latest init

# Crear stories
src/features/**/*.stories.tsx
├── LoginComponent.stories.tsx
├── SimulationForm.stories.tsx
└── SimulationsList.stories.tsx
```

### 3. **README.md Actualizado**
```markdown
# Cali Urban Modeling - Frontend

## Estructura
- See INTEGRATION_GUIDE.md
- See TECHNICAL_REFERENCE.md

## Quick Start
1. npm install
2. npm run dev
3. See .env.local configuration

## API Integration
See INTEGRATION_GUIDE.md for detailed usage
```

---

## 🔧 TOOLING Y CONFIGURACIÓN [PRIORIDAD: BAJA]

```bash
# 1. ESLint + Prettier (ya debería estar)
npm run lint
npm run format

# 2. Pre-commit hooks
npm install --save-dev husky lint-staged

# 3. CI/CD Pipeline
.github/workflows/
├── test.yml
├── lint.yml
└── build.yml

# 4. Environment validation
npm install --save-dev dotenv-cli
```

---

## 🚀 FEATURES AVANZADAS (4-6 semanas)

### 1. **Caché Estratégico**
```typescript
// src/lib/cache.ts
export class CacheManager {
  private cache = new Map<string, CacheEntry>()
  
  set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value as T
  }
}

export const simulationCache = new CacheManager()

// Uso en servicio
async function getSimulation(id: string) {
  const cached = simulationCache.get<SimulationResponseDTO>(`sim:${id}`)
  if (cached) return cached
  
  const sim = await httpClient.get(...)
  simulationCache.set(`sim:${id}`, sim)
  return sim
}
```

### 2. **Real-time con WebSockets**
```typescript
// src/services/websocket/simulationWsService.ts
import { io, Socket } from 'socket.io-client'

class SimulationWsService {
  private socket: Socket | null = null
  
  connect() {
    this.socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: authService.getToken() }
    })
    
    this.socket.on('simulation:updated', (data) => {
      useSimulationStore.getState().setCurrentSimulation(data)
    })
  }
  
  subscribeToSimulation(simulationId: string) {
    this.socket?.emit('subscribe', { simulation_id: simulationId })
  }
}
```

### 3. **Offline Support**
```typescript
// src/lib/persistence.ts
export async function syncOfflineData() {
  const offlineQueue = JSON.parse(
    localStorage.getItem('offlineQueue') || '[]'
  )
  
  for (const request of offlineQueue) {
    try {
      await simulationService.createSimulation(request)
      // Remove from queue
    } catch {
      // Keep in queue
    }
  }
}
```

### 4. **GraphQL Alternative** (Opcional)
```bash
npm install apollo-client graphql

# src/graphql/
# ├── queries/
# │   ├── getSimulation.gql
# │   └── listSimulations.gql
# └── mutations/
#     ├── createSimulation.gql
#     └── runSimulation.gql
```

---

## 📊 PERFORMANCE OPTIMIZATION

### 1. **Code Splitting**
```typescript
// src/app/router.tsx
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
```

### 2. **Image Optimization**
```bash
npm install next/image  # o similar

<img loading="lazy" srcSet="..." />
```

### 3. **Bundle Analysis**
```bash
npm install --save-dev webpack-bundle-analyzer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [visualizer()]
}
```

---

## 🔒 SECURITY HARDENING

### 1. **Validate .env variables**
```typescript
// src/lib/config.ts
const requiredEnvVars = ['VITE_API_URL']

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required env var: ${varName}`)
  }
})
```

### 2. **Content Security Policy**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">
```

### 3. **HTTPS en producción**
```typescript
// Verificar en interceptor
if (import.meta.env.PROD && !location.protocol.startsWith('https')) {
  throw new Error('HTTPS required in production')
}
```

---

## 📋 CHECKLIST FINAL (Antes de producción)

### Código
- [ ] 80%+ test coverage
- [ ] ESLint sin warnings
- [ ] TypeScript strict mode
- [ ] Documentación completa
- [ ] Componentes reutilizables

### Testing
- [ ] ✅ Unit tests para services
- [ ] Tests E2E para flujos críticos
- [ ] Performance tests
- [ ] Accessibility tests (a11y)

### Documentación
- [ ] API docs actualizados
- [ ] README.md completo
- [ ] CONTRIBUTING.md
- [ ] DEPLOYMENT.md

### Configuración
- [ ] .env.example
- [ ] docker-compose.yml (si aplica)
- [ ] CI/CD pipeline
- [ ] Monitoring setup

---

## 📅 TIMELINE SUGERIDO

| Semana | Tarea | Priority |
|--------|-------|----------|
| 1 | Unit tests para services | 🔴 Alta |
| 1 | Tests E2E básicos | 🔴 Alta |
| 2 | Componentes faltantes | 🟡 Media |
| 2 | Error boundaries | 🟡 Media |
| 3 | Storybook setup | 🟡 Media |
| 3 | Caché estratégico | 🟢 Baja |
| 4 | WebSocket integration | 🟢 Baja |
| 4 | Performance optimization | 🟢 Baja |

---

## 💡 TIPS FINALES

### 1. **Mantener la arquitectura limpia**
- No mezclar servicios con componentes
- Usar hooks para integración
- Stores para estado global

### 2. **Documentación viva**
- Actualizar en cada cambio
- Ejemplos actualizados
- Changelog
