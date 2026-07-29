import { useEffect, useState } from 'react'
import { Download, Loader2, Plus, Settings2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImportScenarioModal } from '@/features/scenarios/components/ImportScenarioModal'
import { ScenarioToolbar } from '@/features/scenarios/components/ScenarioToolbar'
import { useExportScenario } from '@/features/scenarios/hooks/useExportScenario'
import {
  simulationEndpoints,
  type EscenarioResponse,
  type ReglaTransicionResponse,
  type VersionEscenarioResponse,
} from '@/services/endpoints/simulation.endpoints'

interface ParameterOption {
  key: string
  label: string
  effect?: 'attractor' | 'repulsor'
  signo?: 1 | -1
  emoji?: string
  min: number
  max: number
  step: number
  defaultValue: number
  suffix?: string
}

interface ParameterRow {
  id: string
  key: string
  value: number
}

const RULE_WEIGHT_OPTIONS: ParameterOption[] = [
  { key: 'temperatura', label: 'Temperatura', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'lluvia', label: 'Lluvia', effect: 'repulsor', signo: -1, min: 0, max: 1, step: 0.05, defaultValue: 0.05 },
  { key: 'riesgo', label: 'Riesgo', effect: 'repulsor', signo: -1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'seguridad', label: 'Seguridad', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'indice_criminalidad', label: 'Índice de criminalidad', effect: 'repulsor', signo: -1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'cobertura_policial', label: 'Cobertura policial', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'poi_atractivo', label: 'POI atractivo', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'atractivo_comercial', label: 'Atractivo comercial', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'proximidad_transporte', label: 'Proximidad transporte', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'densidad_actual', label: 'Densidad actual', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'fachadas_ciegas', label: 'Fachadas ciegas', emoji: '🧱', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'vias_deterioradas', label: 'Vías deterioradas', emoji: '🚧', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'residuos', label: 'Residuos', emoji: '🗑️', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'deficiencia_iluminacion', label: 'Deficiencia de iluminación', emoji: '💡', effect: 'attractor', signo: 1, min: 0, max: 1, step: 0.05, defaultValue: 0.1 },
  { key: 'cai_policial', label: 'CAI policial', emoji: '👮', effect: 'repulsor', signo: -1, min: 0, max: 1, step: 0.05, defaultValue: 0.0 },
  { key: 'guardia_seguridad', label: 'Guardia de seguridad', emoji: '🛡️', effect: 'repulsor', signo: -1, min: 0, max: 1, step: 0.05, defaultValue: 0.0 },
]

const RULE_WEIGHT_TOTAL = 1
// Mantener sincronizado con app/domain/models/regla_transicion.py.
const WEIGHT_EPSILON = 0.001

const CLIMATE_OPTIONS: ParameterOption[] = [
  { key: 'lluvia', label: 'Lluvia', min: 0, max: 1, step: 0.05, defaultValue: 0 },
  { key: 'temperatura', label: 'Temperatura', min: 0, max: 45, step: 1, defaultValue: 25, suffix: '°C' },
]

const SECURITY_OPTIONS: ParameterOption[] = [
  { key: 'riesgo', label: 'Riesgo', min: 0, max: 1, step: 0.05, defaultValue: 0.2 },
  { key: 'cobertura_policial', label: 'Cobertura policial', min: 0, max: 1, step: 0.05, defaultValue: 0.8 },
  { key: 'indice_criminalidad', label: 'Índice criminalidad', min: 0, max: 1, step: 0.05, defaultValue: 0.65 },
]

const GRID_OPTIONS: ParameterOption[] = [
  { key: 'ancho', label: 'Ancho de malla', min: 5, max: 200, step: 1, defaultValue: 20 },
  { key: 'alto', label: 'Alto de malla', min: 5, max: 200, step: 1, defaultValue: 20 },
  { key: 'resolucion_metros', label: 'Resolución', min: 10, max: 250, step: 5, defaultValue: 50, suffix: 'm' },
]

function createParameterRow(option: ParameterOption, valueOverride?: number): ParameterRow {
  return {
    id: `${option.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key: option.key,
    value: valueOverride ?? option.defaultValue,
  }
}

function clampValue(value: number, option: ParameterOption): number {
  if (!Number.isFinite(value)) return option.defaultValue
  return Math.min(option.max, Math.max(option.min, value))
}

function roundWeight(value: number): number {
  return Number(value.toFixed(4))
}

function sumRows(rows: ParameterRow[]): number {
  return roundWeight(rows.reduce((sum, row) => sum + Number(row.value || 0), 0))
}

function rowsToNumberRecord(rows: ParameterRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.key) return acc
    acc[row.key] = row.value
    return acc
  }, {})
}

interface ParameterBuilderProps {
  title: string
  description: string
  options: ParameterOption[]
  rows: ParameterRow[]
  onChange: (rows: ParameterRow[]) => void
  maxTotal?: number
}

function ParameterBuilder({ title, description, options, rows, onChange, maxTotal }: ParameterBuilderProps) {
  const usedKeys = rows.map((row) => row.key)
  const availableOptions = options.filter((option) => !usedKeys.includes(option.key))
  const preview = rowsToNumberRecord(rows)
  const total = sumRows(rows)
  const remaining = maxTotal === undefined ? null : roundWeight(Math.max(0, maxTotal - total))
  const canAddMore = availableOptions.length > 0 && (maxTotal === undefined || total < maxTotal - WEIGHT_EPSILON)

  const updateRow = (rowId: string, patch: Partial<ParameterRow>) => {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const changeKey = (rowId: string, key: string) => {
    const row = rows.find((item) => item.id === rowId)
    const option = options.find((item) => item.key === key)
    if (!row || !option) return
    const otherTotal = sumRows(rows.filter((item) => item.id !== rowId))
    const maxAllowed = maxTotal === undefined ? option.max : Math.min(option.max, Math.max(0, maxTotal - otherTotal))
    updateRow(rowId, { key, value: roundWeight(Math.min(maxAllowed, clampValue(option.defaultValue, option))) })
  }

  const changeValue = (rowId: string, rawValue: number) => {
    const row = rows.find((item) => item.id === rowId)
    const option = options.find((item) => item.key === row?.key)
    if (!row || !option) return
    const otherTotal = sumRows(rows.filter((item) => item.id !== rowId))
    const maxAllowed = maxTotal === undefined ? option.max : Math.min(option.max, Math.max(0, maxTotal - otherTotal))
    updateRow(rowId, { value: roundWeight(Math.min(maxAllowed, clampValue(rawValue, option))) })
  }

  const addRow = () => {
    const nextOption = availableOptions[0]
    if (!nextOption) {
      toast.info('Todos los parámetros disponibles ya fueron agregados')
      return
    }
    if (maxTotal !== undefined && total >= maxTotal - WEIGHT_EPSILON) {
      toast.info('La suma de pesos ya es 1. Reduce un peso para liberar cupo.')
      return
    }
    const nextValue = maxTotal === undefined
      ? nextOption.defaultValue
      : roundWeight(Math.min(nextOption.max, Math.max(nextOption.min, maxTotal - total)))
    onChange([...rows, createParameterRow(nextOption, nextValue)])
  }

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return
    onChange(rows.filter((row) => row.id !== rowId))
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div>
        <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-dark)' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
          {description}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row) => {
          const option = options.find((item) => item.key === row.key) ?? options[0]
          const otherTotal = maxTotal === undefined ? 0 : sumRows(rows.filter((item) => item.id !== row.id))
          const maxAllowed = maxTotal === undefined ? option.max : Math.min(option.max, Math.max(0, maxTotal - otherTotal))
          return (
            <div
              key={row.id}
              className="scenario-param-row"
            >
              <select
                className="sheet-select"
                value={row.key}
                onChange={(event) => changeKey(row.id, event.target.value)}
                aria-label={`${title}: seleccionar clave`}
              >
                {options.map((item) => (
                  <option key={item.key} value={item.key} disabled={item.key !== row.key && usedKeys.includes(item.key)}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="range"
                min={option.min}
                max={maxAllowed}
                step={option.step}
                value={row.value}
                onChange={(event) => changeValue(row.id, Number(event.target.value))}
                aria-label={`${option.label}: ajustar valor`}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />

              <div className="scenario-param-value">
                <input
                  className="sheet-input"
                  type="number"
                  min={option.min}
                  max={maxAllowed}
                  step={option.step}
                  value={row.value}
                  onChange={(event) => changeValue(row.id, Number(event.target.value))}
                  aria-label={`${option.label}: valor numérico`}
                  style={{ padding: '10px 12px' }}
                />
                {option.suffix && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{option.suffix}</span>}
              </div>

              <button
                type="button"
                className="action-button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                title="Eliminar parámetro"
                aria-label={`Eliminar ${option.label}`}
                style={{ padding: '10px 12px' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="action-button" onClick={addRow} disabled={!canAddMore}>
          <Plus size={16} />{availableOptions.length === 0 ? 'Todos agregados' : maxTotal !== undefined && !canAddMore ? 'Sin cupo' : 'Agregar parámetro'}
        </button>
        <code className="scenario-param-preview">
          {JSON.stringify(preview)}
        </code>
      </div>

      {maxTotal !== undefined && (
        <div className="scenario-weight-summary">
          <span>Total: {total.toFixed(2)} / {maxTotal.toFixed(2)}</span>
          <span>Cupo restante: {(remaining ?? 0).toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

export const ScenariosPage = () => {
  const [rules, setRules] = useState<ReglaTransicionResponse[]>([])
  const [scenarios, setScenarios] = useState<EscenarioResponse[]>([])
  const [versions, setVersions] = useState<VersionEscenarioResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isRuleConfirmOpen, setIsRuleConfirmOpen] = useState(false)
  const [isCreatingRule, setIsCreatingRule] = useState(false)
  const { exportScenario, exportingScenarioId, errors: exportErrors } = useExportScenario()

  const [ruleForm, setRuleForm] = useState({
    nombre_regla: '',
    formula: 'atractivo = Σ peso_k * signo_k * factor_k',
    friccion_transito: 0,
    descripcion: '',
  })
  const [ruleWeights, setRuleWeights] = useState<ParameterRow[]>([
    createParameterRow(RULE_WEIGHT_OPTIONS[0]),
  ])
  const [scenarioForm, setScenarioForm] = useState({
    nombre: '',
    regla_transicion_id: '',
  })
  const [climateParams, setClimateParams] = useState<ParameterRow[]>([
    createParameterRow(CLIMATE_OPTIONS[0]),
  ])
  const [securityParams, setSecurityParams] = useState<ParameterRow[]>([
    createParameterRow(SECURITY_OPTIONS[0]),
  ])
  const [gridParams, setGridParams] = useState<ParameterRow[]>([
    createParameterRow(GRID_OPTIONS[0]),
    createParameterRow(GRID_OPTIONS[1]),
  ])

  const fetchAll = async () => {
    setIsLoading(true)
    const [rulesRes, scenariosRes, versionsRes] = await Promise.all([
      simulationEndpoints.listRules(),
      simulationEndpoints.listScenarios(),
      simulationEndpoints.listScenarioVersions(),
    ])
    if (rulesRes.ok) setRules(rulesRes.data)
    if (scenariosRes.ok) setScenarios(scenariosRes.data)
    if (versionsRes.ok) setVersions(versionsRes.data)
    if (!rulesRes.ok || !scenariosRes.ok || !versionsRes.ok) toast.error('No fue posible cargar toda la configuracion')
    setIsLoading(false)
  }

  useEffect(() => {
    fetchAll().catch(() => null)
  }, [])

  const ruleWeightTotal = sumRows(ruleWeights)
  const ruleWeightSummary = ruleWeights.map((row) => ({
    ...row,
    label: `${RULE_WEIGHT_OPTIONS.find((option) => option.key === row.key)?.emoji ?? ''} ${RULE_WEIGHT_OPTIONS.find((option) => option.key === row.key)?.label ?? row.key}`.trim(),
    effect: RULE_WEIGHT_OPTIONS.find((option) => option.key === row.key)?.effect,
    signo: RULE_WEIGHT_OPTIONS.find((option) => option.key === row.key)?.signo,
  }))

  const requestCreateRuleConfirmation = () => {
    if (!ruleForm.nombre_regla.trim()) {
      toast.error('Ingresa un nombre para la regla')
      return
    }
    if (Math.abs(ruleWeightTotal - RULE_WEIGHT_TOTAL) > WEIGHT_EPSILON) {
      toast.error('La suma de pesos debe ser exactamente 1. Ajusta o agrega parámetros para completar el total.')
      return
    }
    setIsRuleConfirmOpen(true)
  }

  const createRule = async () => {
    const pesos = rowsToNumberRecord(ruleWeights)
    setIsCreatingRule(true)
    const res = await simulationEndpoints.createRule({
      nombre_regla: ruleForm.nombre_regla,
      formula: ruleForm.formula,
      descripcion: ruleForm.descripcion,
      friccion_transito: ruleForm.friccion_transito,
      pesos,
    })
    setIsCreatingRule(false)
    if (res.ok) {
      toast.success('Regla creada')
      setIsRuleConfirmOpen(false)
      setRuleForm({ nombre_regla: '', formula: 'atractivo = Σ peso_k * signo_k * factor_k', friccion_transito: 0, descripcion: '' })
      setRuleWeights([createParameterRow(RULE_WEIGHT_OPTIONS[0])])
      fetchAll().catch(() => null)
    } else {
      toast.error('No fue posible crear la regla')
    }
  }

  const createScenario = async () => {
    const variables_clima = rowsToNumberRecord(climateParams)
    const variables_seguridad = rowsToNumberRecord(securityParams)
    const configuracion_malla = rowsToNumberRecord(gridParams)
    const reglaId = Number(scenarioForm.regla_transicion_id)
    if (!reglaId) {
      toast.error('Selecciona una regla para crear el escenario')
      return
    }

    const res = await simulationEndpoints.createScenario({
      nombre: scenarioForm.nombre,
      regla_transicion_id: reglaId,
      variables_clima,
      variables_seguridad,
      configuracion_malla,
    })
    if (res.ok) {
      toast.success('Escenario creado')
      setScenarioForm({ ...scenarioForm, nombre: '' })
      fetchAll().catch(() => null)
    } else {
      toast.error('No fue posible crear el escenario')
    }
  }

  const handleExportScenario = async (scenario: EscenarioResponse) => {
    if (!scenario.id) return
    const ok = await exportScenario(scenario.id, scenario.nombre)
    if (ok) toast.success('Escenario exportado')
    else toast.error(exportErrors[scenario.id]?.[0] ?? 'No fue posible exportar el escenario')
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Modelo / Configuracion</p>
          <h1 className="page-title">Escenarios y Reglas</h1>
        </div>
        <ScenarioToolbar
          onImport={() => setIsImportModalOpen(true)}
          onRefresh={() => fetchAll().catch(() => null)}
        />
      </div>

      <ImportScenarioModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={() => {
          toast.success('Escenario importado')
          fetchAll().catch(() => null)
        }}
      />

      {isRuleConfirmOpen && (
        <div className="scenario-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="rule-confirm-title">
          <div className="scenario-confirm-card">
            <div className="scenario-confirm-header">
              <div>
                <p className="page-eyebrow" style={{ marginBottom: 4 }}>Confirmación</p>
                <h2 id="rule-confirm-title" className="scenario-confirm-title">Crear regla de transición</h2>
              </div>
              <button
                type="button"
                className="scenario-confirm-close"
                onClick={() => setIsRuleConfirmOpen(false)}
                aria-label="Cerrar confirmación"
                disabled={isCreatingRule}
              >
                <X size={18} />
              </button>
            </div>

            <div className="scenario-confirm-body">
              <div className="scenario-confirm-field">
                <span>Nombre</span>
                <strong>{ruleForm.nombre_regla}</strong>
              </div>
              <div className="scenario-confirm-field">
                <span>Descripción</span>
                <p>{ruleForm.descripcion || 'Sin descripción'}</p>
              </div>
              <div className="scenario-confirm-field">
                <span>Fórmula</span>
                <code>{ruleForm.formula}</code>
              </div>
              <div className="scenario-confirm-field">
                <span>Fricción de tránsito</span>
                <strong>{ruleForm.friccion_transito.toFixed(2)}</strong>
              </div>

              <div className="scenario-confirm-weights">
                <div className="scenario-confirm-weights-header">
                  <span>Pesos finales</span>
                  <strong>Total {ruleWeightTotal.toFixed(2)}</strong>
                </div>
                {ruleWeightSummary.map((weight) => (
                  <div key={weight.id} className="scenario-confirm-weight-row">
                    <span>{weight.label}</span>
                    <small>{weight.effect === 'repulsor' ? 'Repulsor' : 'Atractor'} · signo {weight.signo ?? 1}</small>
                    <div className="scenario-confirm-weight-track" aria-hidden="true">
                      <span style={{ width: `${Math.max(0, Math.min(100, weight.value * 100))}%` }} />
                    </div>
                    <strong>{weight.value.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="scenario-confirm-actions">
              <button
                type="button"
                className="action-button"
                onClick={() => setIsRuleConfirmOpen(false)}
                disabled={isCreatingRule}
              >
                Rechazar / Cancelar
              </button>
              <button
                type="button"
                className="action-button"
                onClick={createRule}
                disabled={isCreatingRule}
              >
                {isCreatingRule ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={18} />}
                Aceptar / Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="scenario-form-grid">
        <section className="table-card" style={{ padding: 16 }}>
          <p style={{ margin: 0, fontWeight: 800 }}>Crear regla</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <input className="sheet-input" placeholder="Nombre" value={ruleForm.nombre_regla} onChange={(e) => setRuleForm({ ...ruleForm, nombre_regla: e.target.value })} />
            <input className="sheet-input" placeholder="Formula" value={ruleForm.formula} onChange={(e) => setRuleForm({ ...ruleForm, formula: e.target.value })} />
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Fricción de tránsito (multiplicador independiente del atractivo)
              <input
                className="sheet-input"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={ruleForm.friccion_transito}
                onChange={(e) => setRuleForm({ ...ruleForm, friccion_transito: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <ParameterBuilder
              title="Pesos de la regla"
              description="Selecciona factores atómicos; la suma de pesos debe ser 1 y la polaridad vive en cada factor."
              options={RULE_WEIGHT_OPTIONS}
              rows={ruleWeights}
              onChange={setRuleWeights}
              maxTotal={RULE_WEIGHT_TOTAL}
            />
            <input className="sheet-input" placeholder="Descripcion" value={ruleForm.descripcion} onChange={(e) => setRuleForm({ ...ruleForm, descripcion: e.target.value })} />
            <button className="action-button" onClick={requestCreateRuleConfirmation}><Plus size={18} />Crear regla</button>
          </div>
        </section>

        <section className="table-card" style={{ padding: 16 }}>
          <p style={{ margin: 0, fontWeight: 800 }}>Crear escenario</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <input className="sheet-input" placeholder="Nombre" value={scenarioForm.nombre} onChange={(e) => setScenarioForm({ ...scenarioForm, nombre: e.target.value })} />
            <select className="sheet-select" value={scenarioForm.regla_transicion_id} onChange={(e) => setScenarioForm({ ...scenarioForm, regla_transicion_id: e.target.value })}>
              <option value="">Selecciona una regla</option>
              {rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.nombre_regla}</option>)}
            </select>
            <ParameterBuilder
              title="Variables de clima"
              description="Define condiciones como lluvia o temperatura mediante controles sincronizados."
              options={CLIMATE_OPTIONS}
              rows={climateParams}
              onChange={setClimateParams}
            />
            <ParameterBuilder
              title="Variables de seguridad"
              description="Configura indicadores de riesgo usados por el escenario."
              options={SECURITY_OPTIONS}
              rows={securityParams}
              onChange={setSecurityParams}
            />
            <ParameterBuilder
              title="Configuración de malla"
              description="Ajusta dimensiones y resolución sin editar objetos JSON."
              options={GRID_OPTIONS}
              rows={gridParams}
              onChange={setGridParams}
            />
            <button className="action-button" onClick={createScenario}><Settings2 size={18} />Crear escenario</button>
          </div>
        </section>
      </div>

      <section className="table-card">
        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="loading-text">CARGANDO ESCENARIOS</p>
          </div>
        ) : (
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Escenario</th>
                <th>Activo</th>
                <th>Versiones</th>
                <th>Creacion</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id ?? scenario.nombre}>
                  <td><span className="mono-id">#{scenario.id ?? '-'}</span></td>
                  <td>{scenario.nombre}</td>
                  <td>{scenario.activo ? 'Si' : 'No'}</td>
                  <td>{versions.filter((v) => v.escenario_id === scenario.id).length}</td>
                  <td>{scenario.fecha_creacion ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="action-button"
                      onClick={() => handleExportScenario(scenario)}
                      disabled={!scenario.id || exportingScenarioId === scenario.id}
                      title="Exportar configuración y resultados del escenario"
                    >
                      {exportingScenarioId === scenario.id ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={16} />}
                      Exportar
                    </button>
                    {scenario.id && exportErrors[scenario.id]?.length > 0 && (
                      <p className="text-error" style={{ margin: '6px 0 0' }}>{exportErrors[scenario.id][0]}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="table-card">
        <table className="user-table-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Regla</th>
              <th>Formula</th>
              <th>Pesos</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td><span className="mono-id">#{rule.id}</span></td>
                <td>{rule.nombre_regla}</td>
                <td>{rule.formula}</td>
                <td><code>{JSON.stringify(rule.pesos)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
