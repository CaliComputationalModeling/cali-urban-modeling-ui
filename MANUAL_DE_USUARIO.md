# Manual de Usuario — Simulador Urbano Cali

## 1. ¿Qué es esta aplicación?

Esta plataforma simula la **movilidad de la población en situación de calle** en Santiago de Cali mediante un **autómata celular**. Modela cómo las personas se desplazan entre las 22 comunas de la ciudad en función de:

- **Atractores**: comedores comunitarios, albergues (cambuches) y otros servicios sociales.
- **Movilidad**: qué tan probable es que una persona se desplace a otra zona en cada paso.
- **Permanencia**: qué fracción de la población permanece siempre en su zona sin importar los atractores.
- **Sensibilidad a servicios**: cuánto influyen los puntos de atención en las decisiones de movimiento.

El resultado es una **proyección estadística** (no datos en tiempo real) que permite a tomadores de decisiones anticipar zonas de alta concentración, evaluar la cobertura de servicios y planificar intervenciones.

---

## 2. Crear una simulación

### 2.1. Ruta principal

1. Ve a **Simulación** en el menú lateral.
2. Verás un formulario con dos modos: **Crear nueva** (pestaña activa por defecto) y **Conectar a ejecución existente**.

### 2.2. Parámetros del formulario

| Parámetro | ¿Qué significa? | Rango | Recomendación inicial |
|-----------|----------------|-------|-----------------------|
| **Nombre** | Identificador de la simulación | 3+ caracteres | "Simulación base Cali" |
| **Escenario (version_escenario_id)** | Versión del escenario geográfico (clima, seguridad, malla) | 1+ | 1 |
| **Generaciones** | Número de pasos de tiempo a simular | 1–10 000 | 80 |
| **Radio de suavizado** | Tamaño del área de influencia entre zonas vecinas | 1–50 | 2 |
| **Movilidad** | Probabilidad de que un agente se mude a otra zona por paso | 0–1 | 0.30 |
| **Permanencia base** | Fracción de la población que nunca se desplaza | 0–1 | 0.15 |
| **Sensibilidad al atractivo** | Cuánto influyen los servicios (comedores, albergues) en el movimiento | 0.1–5 | 1.2 |

### 2.3. Escenarios predefinidos

Usa los **presets** del selector para empezar rápido:

| Escenario | Movilidad | Permanencia | Sensibilidad | ¿Qué modela? |
|-----------|-----------|-------------|--------------|--------------|
| **Condiciones normales** | 0.30 | 0.15 | 1.2 | Comportamiento típico diario |
| **Mayor permanencia** | 0.15 | 0.40 | 1.5 | Personas más arraigadas a su zona |
| **Alta movilidad** | 0.55 | 0.08 | 1.8 | Población que se desplaza con frecuencia |
| **Mayor cobertura servicios** | 0.30 | 0.20 | 2.5 | Más servicios sociales disponibles |
| **Clima adverso** | 0.12 | 0.50 | 1.0 | Lluvias intensas o condiciones que reducen el desplazamiento |

### 2.4. Ejecución

Presiona **"Crear y ejecutar"**. El sistema:

1. Envía los parámetros al backend.
2. Inicia la simulación asíncrona con barra de progreso.
3. Cuando finaliza, carga todos los pasos automáticamente.
4. Queda lista para reproducir.

> ⏱ Una simulación de 80 generaciones suele completarse en 15–60 segundos, según la carga del servidor.

---

## 3. Reproductor de simulación

### 3.1. Controles

| Control | Función |
|---------|---------|
| **▶ / ⏸** | Reproducir / Pausar la animación paso a paso |
| **⏭ (un paso)** | Avanza una sola generación manualmente |
| **⏮ (Reiniciar)** | Vuelve a la generación 0 |
| **Lento / Normal / Rápido** | Velocidad de reproducción (2 s / 1 s / 0.5 s por paso) |

### 3.2. Línea de tiempo

Debajo del mapa hay un **slider** que muestra el paso actual. Puedes:
- Arrastrar a cualquier paso para ver ese momento exacto.
- Usar **◀ / ▶** para navegar paso a paso.
- Presionar **Live** para volver a la reproducción en vivo.

### 3.3. Capas del mapa

Actívalas/desactívalas con los botones en la esquina superior derecha del mapa:

| Capa | Color / Estilo | ¿Qué muestra? |
|------|---------------|---------------|
| **Agentes** | 🟡 Amarillo → 🟠 Naranja → 🔴 Rojo | Densidad de población simulada en la cuadrícula |
| **Atractores** | 🔵 Círculos azules | Puntos de interés: comedores, albergues, servicios |
| **Comunas** | ⚪ Bordes blancos punteados | Límites administrativos de las 22 comunas de Cali |

---

## 4. Entender los resultados

### 4.1. Panel de estadísticas (derecha)

| Indicador | ¿Qué significa? |
|-----------|----------------|
| **Personas totales** | Población simulada en el área (suma de todas las celdas) |
| **Concentración máxima** | Valor de densidad más alto en una sola celda (0–1). Arriba de 0.7 = crítico |
| **Zonas ocupadas** | Cuántas celdas de la cuadrícula tienen al menos un agente |
| **Paso actual** | Generación en la que se encuentra la reproducción |
| **En tránsito** | Personas que se están desplazando entre zonas |
| **En comedor** | Personas ubicadas en zonas de comedor comunitario |
| **En cambuche** | Personas en zonas de albergue / cambuche |
| **Zona consumo** | Personas en zonas de consumo |
| **Zona repulsora** | Personas en zonas que repelen la permanencia |

### 4.2. Gráfico de evolución poblacional

Muestra tres líneas a lo largo del tiempo:

- **Total agentes** (cian): población total en cada generación (idealmente estable o ligeramente variable).
- **En tránsito** (gris): cuántas personas se están moviendo — si sube mucho, el sistema está en desequilibrio.
- **En comedor** (verde): personas en comedores — indica cobertura de servicios.

### 4.3. Mapa de densidad (cuadrícula)

Cada celda de la cuadrícula de 100×100 se renderiza como un píxel coloreado:

- **Negro**: sin agentes.
- **Amarillo** 🟡: baja densidad (< 30% del máximo).
- **Naranja** 🟠: densidad media (30–65%).
- **Rojo** 🔴: alta densidad (> 65%).

Haz clic en cualquier celda del mapa para ver la **probabilidad de avistamiento** en ese punto.

### 4.4. Resumen al completar

Al finalizar la simulación aparece un resumen con:

- **Pasos simulados**: generaciones ejecutadas.
- **Personas simuladas**: población total modelada.
- **Concentración máxima**: pico de densidad.
- **Zonas con presencia**: celdas ocupadas.
- **Interpretación automática**: texto explicativo:
  - **> 0.7**: concentración crítica — zonas que requieren intervención prioritaria.
  - **0.4–0.7**: concentración moderada — distribución relativamente equilibrada.
  - **< 0.4**: distribución dispersa — sin zonas de alta concentración.

---

## 5. Interpretación de los colores en la cartografía

### Vista de simulación (SimulationMap)

| Elemento | Color | Significado |
|----------|-------|-------------|
| Celda de agente | 🟡 Amarillo | Baja densidad |
| Celda de agente | 🟠 Naranja | Densidad media |
| Celda de agente | 🔴 Rojo | Alta densidad |
| Atractor (POI) | 🔵 Azul | Punto de servicio social |
| Ruta predicha (intensa) | Rojo | Flujo alto entre origen y destino |
| Ruta predicha (baja) | Azul | Flujo bajo |
| Comuna | ⚪ Borde punteado blanco | Límite administrativo |

### Vista de cartografía (MapsPage)

| Elemento | Color | Significado |
|----------|-------|-------------|
| Celdas KDE | Verde → Rojo | Densidad histórica (observaciones reales) |
| Celdas de simulación | Amarillo → Rojo | Densidad simulada en vivo |
| Ruta predicha | Verde → Rojo | Intensidad de la ruta |
| Confluencia | Verde → Rojo | Punto de encuentro predicho |
| Comedor | 🟢 Verde | Punto de interés tipo comedor |
| Otro atractor | 🟣 Púrpura | Otro tipo de POI |

---

## 6. Interpretar los resultados del autómata celular

### 6.1. ¿Qué mide realmente la simulación?

El autómata modela **cómo cambia la distribución espacial de la población** a lo largo del tiempo. **No predice el futuro con exactitud**, sino que explora escenarios del tipo *"qué pasaría si..."*.

### 6.2. Lectura de concentraciones

| Concentración máxima | Diagnóstico | Acción sugerida |
|----------------------|-------------|-----------------|
| **< 0.3** | Población dispersa. Los servicios existentes cubren bien el área. | Mantener cobertura actual. |
| **0.3 – 0.7** | Se forman aglomeraciones moderadas. Algunas zonas concentran más población. | Reforzar servicios en las zonas naranja. |
| **> 0.7** | Concentración crítica. Zonas con alta densidad de población que pueden saturar los recursos locales. | Priorizar intervención. Evaluar apertura de nuevos puntos de servicio. |

### 6.3. Indicadores de salud del sistema

| Indicador | Valor saludable | Señal de alerta |
|-----------|----------------|-----------------|
| **En tránsito** | 10–30 % de la población | > 50 %: la población no encuentra zonas estables |
| **En comedor** | Según cobertura real | Muy bajo: los comedores no están siendo utilizados |
| **Permanencia** | > 0.10 de base | < 0.05: la población se desplaza sin anclaje |
| **Zonas repulsoras** | Cercano a 0 | > 0: zonas activamente evitadas |

### 6.4. Comparar escenarios

Una forma potente de usar la herramienta es **comparar dos ejecuciones**:

1. Ejecuta un escenario de referencia (ej. "Condiciones normales").
2. Copia el ID de ejecución (se muestra en el formulario cuando está conectado).
3. Ejecuta un segundo escenario (ej. "Mayor cobertura de servicios").
4. Compara los mapas y las métricas para ver cómo cambia la distribución.

---

## 7. Casos de uso típicos

### 7.1. Evaluar cobertura de comedores

Configura **sensibilidad al atractivo = 2.5** y **permanencia base = 0.20**. Si la concentración sigue siendo baja cerca de los comedores, puede indicar que los puntos de servicio no están bien ubicados.

### 7.2. Simular épocas de lluvia

Usa el preset **"Condiciones climáticas adversas"** (baja movilidad, alta permanencia). Si aparecen zonas rojas alrededor de refugios, los albergues pueden saturarse en temporada de lluvias.

### 7.3. Planificar nuevas rutas de movilidad

Con **alta movilidad (0.55)** y **baja permanencia (0.08)** se identifican los corredores de desplazamiento más usados. Las líneas rojas en el mapa indican rutas críticas.

---

## 8. Preguntas frecuentes

**¿Por qué el mapa se ve oscuro?**
Es un mapa base nocturno (CartoDB dark) elegido para que los colores de densidad resalten mejor.

**¿Cuánto tarda una simulación?**
Depende del número de generaciones y la carga del servidor. Una simulación de 80 pasos suele completarse en menos de 1 minuto.

**¿Puedo ver simulaciones anteriores?**
Sí. En la pestaña **"Conectar a ejecución existente"** ingresa el ID de una ejecución previa y presiona "Conectar". Todos los pasos se cargarán para reproducirlos.

**¿Qué significa el ID de ejecución?**
Es el identificador único que el backend asigna a cada simulación. Puedes copiarlo para compartir resultados o cargarlos después.

**Los datos en el mapa de cartografía son distintos a los de simulación. ¿Por qué?**
La vista de **Cartografía** muestra datos históricos agregados (heatmap KDE) y predicciones de rutas. La vista de **Simulación** muestra los resultados del autómata celular en vivo. Son complementarias.

**¿Puedo descargar los resultados?**
En la sección **Reportes** puedes generar documentos PDF y Excel con los resultados de las simulaciones.

---

## 9. Glosario

| Término | Definición |
|---------|------------|
| **Autómata celular** | Modelo matemático donde una cuadrícula de celdas evoluciona según reglas locales. Cada celda representa una zona de Cali. |
| **Generación** | Un paso de tiempo en la simulación. Equivale a un ciclo del autómata. |
| **Densidad** | Valor entre 0 y 1 que indica qué tan concentrada está la población en una celda. |
| **Comuna** | Subdivisión administrativa de Cali. La ciudad tiene 22 comunas. |
| **Atractor** | Punto de interés (comedor, albergue, servicio social) que influye en el movimiento de la población. |
| **Movilidad** | Probabilidad de que un agente cambie de celda en cada generación. |
| **Permanencia base** | Fracción de la población que nunca se desplaza, independientemente de los atractores. |
| **KDE** | Kernel Density Estimation — estimación de densidad basada en observaciones históricas reales. |
| **POI** | Point of Interest — punto de interés en el mapa. |
| **GeoJSON** | Formato estándar para datos geográficos usado para renderizar las capas del mapa. |

---

## 10. Soporte

Para reportar errores o sugerir mejoras, contacta al equipo de desarrollo o abre un issue en el repositorio del proyecto.
