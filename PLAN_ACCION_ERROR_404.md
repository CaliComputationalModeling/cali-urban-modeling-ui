# 🚀 PLAN DE ACCIÓN INMEDIATO - Error 404 en Simulaciones

**Estado:** ✅ CÓDIGO ACTUALIZADO Y COMPILADO  
**Fecha:** 2026-05-18  
**Prioridad:** 🔴 CRÍTICO  

---

## 📋 RESUMEN DE CAMBIOS REALIZADOS

### ✅ MODIFICADOS (3 archivos)

#### 1. **`src/store/simulationStore.ts`** - LOGGING Y RESILENCIA
- ✅ Búsqueda exhaustiva de `ejecucion_id` (incluye variantes: `id`, `execution_id`)
- ✅ Fallback inteligente a `simulation_id` si 404 persistente
- ✅ Logging detallado de POST y polling cada segundo
- ✅ Manejo específico de error 404 con message
- ✅ Estados normalizados (lowercase) para compatibilidad

**Cambios:**
```typescript
// ANTES: Búsqueda simple (fallaba fácilmente)
const ejecucionId = data.ejecucion_id || data.id

// DESPUÉS: Búsqueda exhaustiva + logging
const ejecucionId = data.ejecucion_id || data.id || data.execution_id || null
const simulationId = data.simulation_id || data.simulacion_id || null
console.log('[executeSimulationAsync] Respuesta POST:', { raw: data, ejecucionId, ... })
```

#### 2. **`src/shared/contracts/simulation.contract.ts`** - CONTRATO FLEXIBLE
- ✅ `CreateSimulationResponse` ahora acepta múltiples variantes
- ✅ Campos opcionales (todos `?`) para máxima compatibilidad
- ✅ Variantes en inglés/español: `estado`/`status`, `mensaje`/`message`

**Cambios:**
```typescript
// ANTES: Solo simulation_id requerido
export interface CreateSimulationResponse {
  simulation_id: SimulationId  // ← Requerido
  nombre: string
}

// DESPUÉS: Múltiples variantes opcionales
export interface CreateSimulationResponse {
  ejecucion_id?: string | number     // ← Asíncrono
  execution_id?: string | number     // ← Variante
  simulation_id?: string | number    // ← Síncrono
  simulacion_id?: string | number    // ← Variante
  estado?: string
  status?: string                    // ← Variante
  // ... muchos más campos opcionales
}
```

#### 3. **`src/services/endpoints/simulation.endpoints.ts`** - DEBUGGING
- ✅ Nuevo endpoint `debugBackendStatus()` para verificar salud del backend
- ✅ Retorna información: versión, conexión a DB, cache size

**Cambios:**
```typescript
debugBackendStatus: () =>
  http.get<{
    backend_version?: string
    database_connected?: boolean
    cache_size?: number
  }>('/api/health/simulaciones')
```

---

## 🧪 TESTING INMEDIATO (5-10 minutos)

### PASO 1: Verificar Backend (sin UI)

**En terminal:**
```bash
# Test 1: ¿Backend está vivo?
curl -s http://localhost:8000/api/health/simulaciones | jq .

# Test 2: Ejecutar simulación y obtener respuesta exacta
curl -X POST 'http://localhost:8000/api/simulaciones/ejecutar' \
  -H 'Content-Type: application/json' \
  -d '{
    "version_escenario_id": 1,
    "generaciones": 5,
    "radio_suavizado": 1,
    "movilidad": 0.25,
    "permanencia_base": 0.1,
    "sensibilidad_atractivo": 1.0
  }' | jq .

# Tomar nota del valor retornado:
# ¿Es "ejecucion_id"? ¿O "id"? ¿O "simulation_id"?
```

**Resultado esperado:**
```json
{
  "ejecucion_id": "sim_20260518_abc123",
  "estado": "pendiente",
  "mensaje": "Simulación encolada"
}
// O alternativamente:
{
  "simulation_id": 2,
  "estado": "finalizado",
  "nombre": "sim_2026-05-18_..."
}
```

---

### PASO 2: Verificar Frontend (con UI)

**En browser:**
1. Abrir DevTools → Console
2. Abrir DevTools → Network (pestana)
3. Ejecutar simulación desde UI
4. Ver logs en Console (buscar `[executeSimulationAsync]`)
5. Ver POST en Network → buscar `/api/simulaciones/ejecutar`
6. Verificar respuesta JSON exacta

**Esperado en Console:**
```javascript
[executeSimulationAsync] Respuesta POST: {
  raw: { ejecucion_id: "sim_...", ... },
  ejecucionId: "sim_...",
  simulationId: null,
  hasAsyncFlow: true,
  timestamp: "2026-05-18T14:30:00Z"
}

[Polling 1/300] {
  ejecucionId: "sim_...",
  statusCode: 200,
  statusOk: true,
  data: { estado: "en_proceso", progreso: 45, ... }
}
```

---

### PASO 3: Validar Flujo Completo

**Checklist:**
- [ ] POST retorna 201 ✅
- [ ] GET /api/simulaciones/{id}/estado retorna 200 (no 404) ✅
- [ ] Polling avanza cada segundo en Console ✅
- [ ] Simulación cambia de "en_proceso" a "finalizado" ✅
- [ ] No hay errores 404 ✅
- [ ] UI muestra "Estado: finalizado" ✅

---

## 🐛 SI FALLA - DEBUGGING

### Error: "404 - Ejecución no encontrada"

**Diagnosis:**

```javascript
// En Console verás:
[executeSimulationAsync] Respuesta POST: {
  ejecucionId: null,           // ← PROBLEMA: null
  simulationId: 2,
  hasAsyncFlow: false
}
```

**Solución:**
- Backend está retornando SOLO `simulation_id` (flujo síncrono)
- Esto es correcto si la simulación completa en < 2 segundos
- Verifca que `/api/simulaciones/{id}/pasos` esté implementado

---

### Error: "Backend no retornó ejecucion_id ni simulation_id"

**Diagnosis:**
- La respuesta POST no tiene NINGUNO de los campos esperados
- Backend puede estar retornando estructura completamente diferente

**Solución - Ver respuesta exacta:**
```javascript
// En DevTools → Network → POST → Response
// Copiar JSON completo y compartir
```

---

### Error: "Timeout esperando resultado (5 minutos)"

**Diagnosis:**
- Backend fue encontrado (201 Created)
- Pero GET /api/simulaciones/{id}/estado nunca retorna 200
- O retorna estructura inesperada

**Solución:**
```bash
# Ver qué retorna el endpoint de estado
curl -X GET 'http://localhost:8000/api/simulaciones/sim_123/estado' \
  -H 'Authorization: Bearer TOKEN'
```

---

## 📚 ARCHIVOS DOCUMENTACIÓN

Generados para referencia:

1. **[ERROR_404_DIAGNOSTICO_TECNICO.md](ERROR_404_DIAGNOSTICO_TECNICO.md)**
   - Análisis profundo del problema
   - Arquitectura hexagonal recomendada
   - Plan de migración a PostgreSQL (3 fases)

2. **[CORRECCION_ERROR_404_FRONTEND.md](CORRECCION_ERROR_404_FRONTEND.md)**
   - Código exacto de correcciones
   - Testing detallado
   - Checklist pre-deploy

3. **[/memories/session/error404-analysis.md](/memories/session/error404-analysis.md)**
   - Notas de progreso
   - Tareas pendientes

---

## ✅ PRÓXIMOS PASOS

### HOJA DE RUTA

#### HOY (Validación)
- [ ] Ejecutar tests de Terminal (Paso 1)
- [ ] Ejecutar tests de UI (Paso 2)
- [ ] Confirmar que GET /estado NO retorna 404
- [ ] Verificar logs en Console

#### ESTA SEMANA (Correcciones Backend)
- [ ] Backend retorna `ejecucion_id` en POST
- [ ] Backend persiste en PostgreSQL (no in-memory)
- [ ] Backend implementa `/api/health/simulaciones`

#### PRÓXIMA SEMANA (Escalabilidad)
- [ ] Implementar Celery/Redis para jobs asíncronos
- [ ] Crear tabla `pasos_simulacion` con índices
- [ ] Tests de carga (100+ simulaciones paralelas)

---

## 🎯 CHECKLIST FINAL

- [x] ✅ Código compilado sin errores
- [x] ✅ Logging de debugging agregado
- [x] ✅ Contrato flexible (múltiples variantes)
- [x] ✅ Endpoint de health/debugging
- [x] ✅ Documentación exhaustiva generada
- [ ] ⏳ Pruebas manuales completadas
- [ ] ⏳ Backend corregido
- [ ] ⏳ Deploy a producción

---

## 📞 SOPORTE

Si falla en testing, compartir:

1. **Respuesta POST exacta** (copiar desde DevTools Network)
2. **Logs de Console** (screenshot o copiar)
3. **Respuesta GET /estado** (curl desde terminal)
4. **Error message exacto**

---

**Preparado por:** AI Architect  
**Licencia:** Proyecto de Grado - SIMCORE  
**Última actualización:** 2026-05-18T15:00Z  

**¡LISTO PARA TESTING! 🚀**
