import type { SimulationLog } from "@/shared/types/simulation.types"
import { X } from "lucide-react"

interface LogConsoleProps {
  logs: SimulationLog[]
  onClear?: () => void
  maxHeight?: string
}

export const LogConsole = ({ logs, onClear, maxHeight = "400px" }: LogConsoleProps) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400"
      case "warning":
        return "text-yellow-400"
      case "success":
        return "text-green-400"
      default:
        return "text-blue-400"
    }
  }

  const getLevelPrefix = (level: string) => {
    switch (level) {
      case "error":
        return "❌"
      case "warning":
        return "⚠️ "
      case "success":
        return "✅"
      default:
        return "ℹ️ "
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-700">Consola de Logs</h3>
        {onClear && <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X size={16} />
          Limpiar
        </button>}
      </div>
      <div
        className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-y-auto border border-gray-700"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <p className="text-gray-600">Sin logs aún...</p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={`${getLevelColor(log.level)} mb-1`}>
              <span className="text-gray-500">[{log.timestamp}]</span>
              <span className="ml-2">{getLevelPrefix(log.level)} {log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
