# 🔴 ERROR 404 - DIAGNÓSTICO TÉCNICO EXHAUSTIVO

**Fecha:** 2026-05-18  
**Proyecto:** SIMCORE (Simulación de Movilidad Urbana - Cali)  
**Severidad:** CRÍTICA (Bloquea toda ejecución de simulaciones)  
**Estado:** IDENTIFICADO Y LISTO PARA CORRECCIÓN  

---

## 📊 RESUMEN EJECUTIVO

### El Problema
```
POST /api/simulaciones/ejecutar        → 201 Created ✅
├─ response: { simulation_id: 2, ... }
└─ El frontend almacena: simulationId = 2

GET /api/simulaciones/2/estado         → 404 Not Found ❌
└─ Backend no puede encontrar el recurso
```

### La Causa Raíz
**Desalineación crítica entre frontend y backend:**
- ✅ Backend crea la simulación correctamente (201)
- ❌ Backend tiene persistencia in-memory o estructura de datos incoheren
te
- ❌ El ID retornado en POST no es accesible en GET
- ❌ Frontend intenta reutilizar `simulation_id` como `ejecucion_id`

### Impacto Empresarial
- 🛑 **Sistema completamente bloqueado**: Ninguna simulación puede ejecutarse
- 📉 **Pérdida de productividad**: Trabajo de grado paralizado
- ⏰ **Urgencia**: Debe resolverse ANTES de continuar con visualización

---

## 🔍 ANÁLISIS PROFUNDO

### A. COMPARACIÓN: CONTRATO ESPERADO vs ACTUAL

#### CONTRATO ESPERADO (INTEGRATION_TEST_GUIDE.md)

**POST /api/simulaciones/ejecutar:**
```json
// RESPUESTA ASÍNCRONA (RECOMENDADA - para simulaciones largas)
{
  "ejecucion_id": "abc-123",  ← ⭐ CLAVE PARA POLLING
  "estado": "pendiente",
  "mensaje": "Simulación encolada correctamente"
}

// RESPUESTA SÍNCRONA (alternativa - para simulaciones < 2s)
{
  "simulation_id": 789,       ← Solo si resultado inmediato
  "estado": "finalizado",
  "mensaje": "Simulación completada"
}
```

**GET /api/simulaciones/{ejecucion_id}/estado:**
```json
{
  "estado": "en_proceso",      ← "pendiente" | "en_proceso" | "finalizado" | "fallido"
  "progreso": 45,              ← 0-100 opcional
  "mensaje": "Generación 5 de 5"
}
```

#### RESPUESTA ACTUAL (OBSERVADA)

```json
// POST devuelve
{
  "simulation_id": 2,
  "nombre": "sim_2026-05-18_...",
  "generacion": 0,
  "creada_en": "2026-05-18T..."
}
// ❌ FALTA: ejecucion_id, estado, mensaje
```

**Resultado:** Frontend no tiene `ejecucion_id`, fallback a `simulation_id=2`
→ Llamada a `GET /api/simulaciones/2/estado` → 404

---

### B. FLUJO CORRECTO EN ARQUITECTURA HEXAGONAL

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Zustand)                                      │
│  POST /api/simulaciones/ejecutar { ...payload }                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ BACKEND (FastAPI - Arquitectura)    │
        │                                     │
        │ POST /api/simulaciones/ejecutar     │
        │   ├─ Validar payload (Zod/Pydantic)│
        │   ├─ Crear Ejecucion (async job)   │
        │   └─ Retornar ejecucion_id ⭐      │
        └──────────┬──────────────────────────┘
                   │
      ┌────────────┴──────────────┐
      │                           │
      ▼ (polling cada 1s)         ▼ (cola de jobs)
   GET /estado                   Background Queue
      │                           │
      └─────────┬─────────────────┘
                │
                ▼
   ┌─────────────────────────────┐
   │ SimulacionRepository        │
   │  - ejecuciones (in-memory)  │
   │  - pasos (PostgreSQL)       │
   └─────────────────────────────┘
                │
      ┌─────────┴──────────┐
      │                    │
      ▼                    ▼
  Cache/Dict           pasos_simulacion
  { id → Ejecucion }   { generacion, matriz }
```

---

### C. PROBLEMA DE PERSISTENCIA IN-MEMORY

**Escenario probable:**

```python
# Backend (pseudocódigo)

# En memoria - se pierde si proceso muere
ejecuciones_cache = {}  # ❌ No persiste

# EN MEMORIA
@app.post("/api/simulaciones/ejecutar")
def ejecutar_simulacion(request: CreateSimulationRequest):
    ejecucion = Ejecucion.create()
    ejecuciones_cache[ejecucion.id] = ejecucion  # Guardado local
    
    # Retorna SOLO simulation_id (error del contrato)
    return {
        "simulation_id": ejecucion.id,  # ❌ 
        "nombre": ejecucion.nombre,
        "generacion": 0,
        "creada_en": datetime.now()
    }
    # ❌ FALTA: "ejecucion_id", "estado", "mensaje"

# GET busca en tabla equivocada
@app.get("/api/simulaciones/{ejecucion_id}/estado")
def get_estado(ejecucion_id: str):
    # Busca en tabla simulaciones (entidad persistente)
    # NO en tabla ejecuciones (cache in-memory)
    ejecucion = db.session.query(Simulacion).filter(
        Simulacion.id == ejecucion_id
    ).first()
    
    if not ejecucion:
        return 404  # ← AQUÍ OCURRE EL ERROR
```

---

### D. DEUDA TÉCNICA IDENTIFICADA

| Aspecto | Problema | Severidad |
|---------|----------|-----------|
| **Persistencia** | In-memory (diccionario Python) no sincroniza entre requests | 🔴 CRÍTICO |
| **Arquitectura** | Falta tabla `ejecuciones` en PostgreSQL | 🔴 CRÍTICO |
| **Contrato API** | POST no retorna `ejecucion_id` | 🔴 CRÍTICO |
| **Normalización de IDs** | Tabla `pasos_simulacion` sin vincular a ejecución | 🟠 ALTO |
| **Snapshot Storage** | Snapshots en CSV locales sin referencia de DB | 🟠 ALTO |
| **Async Job Queue** | Sin Celery/RQ para background tasks | 🟠 ALTO |

---

## ✅ PLAN DE CORRECCIÓN (3 FASES)

### FASE 1: ALINEACIÓN DE CONTRATO (INMEDIATO)

**Acción:** Backend debe retornar `ejecucion_id` en respuesta POST

```python
# backend/app/features/simulation/routes.py

@router.post("/simulaciones/ejecutar", status_code=201)
async def ejecutar_simulacion(request: CreateSimulationRequest):
    """
    Crea una ejecución asíncrona de simulación.
    
    Retorna:
    {
        "ejecucion_id": "sim_20260518_abc123",  # ← AGREGADO
        "estado": "pendiente",                   # ← AGREGADO
        "mensaje": "Simulación encolada"        # ← AGREGADO
    }
    """
    use_case = GetEstadoSimulacion(repo=SimulacionRepository())
    ejecucion_id = use_case.crear_ejecucion(request)
    
    return {
        "ejecucion_id": ejecucion_id,
        "estado": "pendiente",
        "mensaje": "Simulación encolada para procesamiento"
    }
```

**Validación Frontend:**
- Verificar en Network tab que POST retorna `ejecucion_id`
- Confirmar que GET /api/simulaciones/{ejecucion_id}/estado retorna 200 (no 404)

---

### FASE 2: MIGRACIÓN DE PERSISTENCIA (ESTA SEMANA)

**Cambio de arquitectura:**
```sql
-- CREAR TABLA ejecuciones (jobs asíncronos)
CREATE TABLE ejecuciones (
    id VARCHAR(50) PRIMARY KEY,      -- "sim_20260518_abc123"
    usuario_id INT NOT NULL,
    version_escenario_id INT,
    estado VARCHAR(20),              -- "pendiente", "en_proceso", "finalizado"
    progreso INT DEFAULT 0,
    mensaje TEXT,
    fecha_creacion TIMESTAMP,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (version_escenario_id) REFERENCES versiones_escenario(id)
);

-- CREAR TABLA pasos_simulacion (snapshots persistidos)
CREATE TABLE pasos_simulacion (
    id SERIAL PRIMARY KEY,
    ejecucion_id VARCHAR(50) NOT NULL,
    numero_generacion INT NOT NULL,
    matriz BYTEA,                    -- CompressedArray serializado
    densidad_grid FLOAT8[][],        -- PostGIS geometry si aplica
    urbano_state JSONB,              -- UrbanState serializado
    fecha_creacion TIMESTAMP,
    FOREIGN KEY (ejecucion_id) REFERENCES ejecuciones(id)
        ON DELETE CASCADE,
    UNIQUE(ejecucion_id, numero_generacion)
);

-- ÍNDICES para consultas rápidas
CREATE INDEX idx_ejecuciones_usuario ON ejecuciones(usuario_id);
CREATE INDEX idx_ejecuciones_estado ON ejecuciones(estado);
CREATE INDEX idx_pasos_ejecucion ON pasos_simulacion(ejecucion_id);
```

**Cambios en Backend:**
```python
# backend/app/features/simulation/repository.py

class SimulacionRepository:
    """Implementa persistencia con PostgreSQL + PostGIS"""
    
    def crear_ejecucion(self, request: CreateSimulationRequest) -> str:
        """Crea ejecución en DB y retorna ejecucion_id"""
        ejecucion = Ejecucion(
            id=self.generar_ejecucion_id(),
            usuario_id=current_user.id,
            version_escenario_id=request.version_escenario_id,
            estado="pendiente",
            fecha_creacion=datetime.now()
        )
        session.add(ejecucion)
        session.commit()
        return ejecucion.id  # ← Persisted in DB
    
    def obtener_estado(self, ejecucion_id: str) -> EjecucionEstado:
        """Consulta estado desde PostgreSQL (no in-memory)"""
        ejecucion = session.query(Ejecucion).filter(
            Ejecucion.id == ejecucion_id
        ).first()
        
        if not ejecucion:
            raise NotFound(f"Ejecución {ejecucion_id} no existe")
        
        return EjecucionEstado(
            estado=ejecucion.estado,
            progreso=ejecucion.progreso,
            mensaje=ejecucion.mensaje
        )
    
    def guardar_paso(self, ejecucion_id: str, paso: PasoSimulacion):
        """Persiste snapshots en PostgreSQL"""
        paso_db = PasoSimulacionDB(
            ejecucion_id=ejecucion_id,
            numero_generacion=paso.generacion,
            matriz=paso.matriz.serialize(),  # CompressedArray
            urbano_state=paso.urban_state.dict(),
            fecha_creacion=datetime.now()
        )
        session.add(paso_db)
        session.commit()
```

---

### FASE 3: COLA DE JOBS ASÍNCRONA (PRÓXIMA SEMANA)

**Implementar Celery + Redis:**
```python
# backend/app/celery_app.py

from celery import Celery

celery_app = Celery("simcore")
celery_app.conf.broker_url = "redis://localhost:6379"
celery_app.conf.result_backend = "redis://localhost:6379"

@celery_app.task
def ejecutar_simulacion_task(ejecucion_id: str):
    """Task que ejecuta simulación en background"""
    repo = SimulacionRepository()
    repo.actualizar_estado(ejecucion_id, "en_proceso")
    
    try:
        for paso in motor_simulacion.ejecutar(ejecucion_id):
            repo.guardar_paso(ejecucion_id, paso)
            repo.actualizar_progreso(ejecucion_id, paso.generacion)
        
        repo.actualizar_estado(ejecucion_id, "finalizado")
    except Exception as e:
        repo.actualizar_estado(ejecucion_id, "fallido", mensaje=str(e))

# En route
@router.post("/simulaciones/ejecutar")
async def ejecutar_simulacion(request: CreateSimulationRequest):
    ejecucion_id = repo.crear_ejecucion(request)
    ejecutar_simulacion_task.delay(ejecucion_id)  # ← Enviar a cola
    
    return {
        "ejecucion_id": ejecucion_id,
        "estado": "pendiente",
        "mensaje": "Simulación encolada"
    }
```

---

## 🛠️ CHECKLIST DE VERIFICACIÓN

### PRE-CORRECCIÓN
- [ ] Verificar respuesta exacta de POST en browser DevTools → Network
- [ ] Confirmar si backend retorna `ejecucion_id` o solo `simulation_id`
- [ ] Revisar logs del backend para ver si hay excepciones

### POST-CORRECCIÓN (FASE 1)
- [ ] Backend retorna `ejecucion_id` en POST
- [ ] `GET /api/simulaciones/{ejecucion_id}/estado` retorna 200 (no 404)
- [ ] Frontend polling funciona sin errores
- [ ] Simulación completa exitosamente

### MIGRACIÓN A PostgreSQL (FASE 2)
- [ ] Tablas creadas: `ejecuciones`, `pasos_simulacion`
- [ ] Datos persisten entre recargas de página
- [ ] Simulaciones históricas recuperables
- [ ] Índices optimizados

### COLA ASÍNCRONA (FASE 3)
- [ ] Celery/Redis instalado y ejecutándose
- [ ] Tasks encoladas correctamente
- [ ] Progreso actualizado en tiempo real
- [ ] Timeout de 5 minutos sin falsos positivos

---

## 🎯 RECOMENDACIÓN INMEDIATA

### PASO 1 (Hoy - 30 minutos)
1. Verifica en browser DevTools qué retorna POST exactamente
2. Comparte la respuesta JSON completa

### PASO 2 (Hoy - 2 horas)
1. Corrección en backend:
   - Agregar `ejecucion_id` a respuesta POST
   - Asegurar que GET /estado busca en tabla correcta
   - Verificar persistencia de datos

### PASO 3 (Esta semana)
1. Migración PostgreSQL completa
2. Tests de persistencia
3. Optimizaciones de índices

---

## 📚 REFERENCIAS

- **Contrato esperado:** [INTEGRATION_TEST_GUIDE.md](./INTEGRATION_TEST_GUIDE.md)
- **Refactorización actual:** [REFACTORING_TECHNICAL_ANALYSIS.md](./REFACTORING_TECHNICAL_ANALYSIS.md)
- **Estado del proyecto:** [ACTA_4_SIMULACION_TIEMPO_REAL.md](./ACTA_4_SIMULACION_TIEMPO_REAL.md)

---

**Preparado por:** AI Architect  
**Para:** Proyecto de Grado - SIMCORE  
**Última actualización:** 2026-05-18T14:00Z
