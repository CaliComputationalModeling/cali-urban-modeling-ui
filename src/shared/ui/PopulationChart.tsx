"use client"

/**
 * PopulationChart — Gráfica de población en tiempo real.
 *
 * Instalación requerida:
 *   npm install recharts
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useSimulationStore } from "@/store/simulationStore"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Trash2 } from "lucide-react"

interface PopulationPoint {
  generation: number
  alive: number
  dead: number
  density: number
}

interface TooltipPayload {
  name: string
  color: string
  value: number
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
}

// Tooltip personalizado para que muestre los datos bien formateados
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-xs space-y-1">
      <p className="font-medium text-gray-700">Generación {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export const PopulationChart = () => {
  const simulationId = useSimulationStore((s) => s.simulationId)
  const history = useSimulationStore((s) => s.history)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)

  const populationHistory: PopulationPoint[] = history.map((point) => ({
    generation: point.generacion,
    alive: point.total_agentes,
    dead: 0,
    density: point.total_agentes > 0 ? point.total_agentes / Math.max(point.total_agentes, 1) : 0,
  }))

  const clearPopulationHistory = () => {
    void resetSimulation()
  }

  const isEmpty = populationHistory.length === 0

  return (
    <Card title="Población en Tiempo Real">
      <div className="space-y-4">
        {/* Métricas rápidas */}
        {populationHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Máximo vivas</p>
              <p className="text-xl font-bold text-indigo-600">
                {Math.max(...populationHistory.map((p) => p.alive)).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Actual vivas</p>
              <p className="text-xl font-bold text-green-600">
                {populationHistory[populationHistory.length - 1]?.alive.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Densidad actual</p>
              <p className="text-xl font-bold text-purple-600">
                {((populationHistory[populationHistory.length - 1]?.density ?? 0) * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {/* Gráfica */}
        <div style={{ height: "260px" }}>
          {isEmpty ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {simulationId
                ? "Ejecuta pasos para ver la evolución de la población"
                : "Carga una simulación primero"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={populationHistory}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAlive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="generation"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  label={{ value: "Generación", position: "insideBottom", offset: -2, fontSize: 11, fill: "#9ca3af" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  formatter={(value) => (value === "alive" ? "Vivas" : "Muertas")}
                />
                <Area
                  type="monotone"
                  dataKey="alive"
                  name="alive"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorAlive)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="dead"
                  name="dead"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  fill="url(#colorDead)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Limpiar historial */}
        {!isEmpty && (
          <div className="flex justify-end">
            <Button
              onClick={clearPopulationHistory}
              variant="secondary"
              className="text-xs py-1 px-3"
            >
              <Trash2 size={14} className="mr-1" />
              Limpiar historial
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
