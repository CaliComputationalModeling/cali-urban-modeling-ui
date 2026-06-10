import { useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  simulationEndpoints,
  type EscenarioResponse,
  type ReglaTransicionResponse,
  type VersionEscenarioResponse,
} from '@/services/endpoints/simulation.endpoints'

function parseJsonObject(value: string, label: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // handled below
  }
  toast.error(`${label} debe ser un objeto JSON valido`)
  return null
}

export const ScenariosPage = () => {
  const [rules, setRules] = useState<ReglaTransicionResponse[]>([])
  const [scenarios, setScenarios] = useState<EscenarioResponse[]>([])
  const [versions, setVersions] = useState<VersionEscenarioResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [ruleForm, setRuleForm] = useState({
    nombre_regla: '',
    formula: 'atractivo = clima + seguridad',
    pesos: '{"clima": 0.5, "seguridad": 0.5}',
    descripcion: '',
  })
  const [scenarioForm, setScenarioForm] = useState({
    nombre: '',
    regla_transicion_id: '',
    variables_clima: '{"lluvia": 0, "temperatura": 25}',
    variables_seguridad: '{"riesgo": 0.2}',
    configuracion_malla: '{"ancho": 20, "alto": 20, "densidad_inicial": []}',
  })

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

  const createRule = async () => {
    const pesos = parseJsonObject(ruleForm.pesos, 'Pesos')
    if (!pesos) return
    const res = await simulationEndpoints.createRule({
      nombre_regla: ruleForm.nombre_regla,
      formula: ruleForm.formula,
      descripcion: ruleForm.descripcion,
      pesos: pesos as Record<string, number>,
    })
    if (res.ok) {
      toast.success('Regla creada')
      setRuleForm({ nombre_regla: '', formula: 'atractivo = clima + seguridad', pesos: '{"clima": 0.5, "seguridad": 0.5}', descripcion: '' })
      fetchAll().catch(() => null)
    } else {
      toast.error('No fue posible crear la regla')
    }
  }

  const createScenario = async () => {
    const variables_clima = parseJsonObject(scenarioForm.variables_clima, 'Variables clima')
    const variables_seguridad = parseJsonObject(scenarioForm.variables_seguridad, 'Variables seguridad')
    const configuracion_malla = parseJsonObject(scenarioForm.configuracion_malla, 'Configuracion malla')
    const reglaId = Number(scenarioForm.regla_transicion_id)
    if (!variables_clima || !variables_seguridad || !configuracion_malla || !reglaId) return

    const res = await simulationEndpoints.createScenario({
      nombre: scenarioForm.nombre,
      regla_transicion_id: reglaId,
      variables_clima: variables_clima as Record<string, number>,
      variables_seguridad: variables_seguridad as Record<string, number>,
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

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Modelo / Configuracion</p>
          <h1 className="page-title">Escenarios y Reglas</h1>
        </div>
        <button className="action-button" onClick={() => fetchAll().catch(() => null)}>
          <RefreshCw size={18} />Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <section className="table-card" style={{ padding: 16 }}>
          <p style={{ margin: 0, fontWeight: 800 }}>Crear regla</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <input className="sheet-input" placeholder="Nombre" value={ruleForm.nombre_regla} onChange={(e) => setRuleForm({ ...ruleForm, nombre_regla: e.target.value })} />
            <input className="sheet-input" placeholder="Formula" value={ruleForm.formula} onChange={(e) => setRuleForm({ ...ruleForm, formula: e.target.value })} />
            <input className="sheet-input" placeholder="Pesos JSON" value={ruleForm.pesos} onChange={(e) => setRuleForm({ ...ruleForm, pesos: e.target.value })} />
            <input className="sheet-input" placeholder="Descripcion" value={ruleForm.descripcion} onChange={(e) => setRuleForm({ ...ruleForm, descripcion: e.target.value })} />
            <button className="action-button" onClick={createRule}><Plus size={18} />Crear regla</button>
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
            <input className="sheet-input" value={scenarioForm.variables_clima} onChange={(e) => setScenarioForm({ ...scenarioForm, variables_clima: e.target.value })} />
            <input className="sheet-input" value={scenarioForm.variables_seguridad} onChange={(e) => setScenarioForm({ ...scenarioForm, variables_seguridad: e.target.value })} />
            <input className="sheet-input" value={scenarioForm.configuracion_malla} onChange={(e) => setScenarioForm({ ...scenarioForm, configuracion_malla: e.target.value })} />
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
