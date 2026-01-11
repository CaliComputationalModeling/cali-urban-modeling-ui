import { Card } from "@/shared/ui/Card"
import { AlertCircle } from "lucide-react"

export const GeographicAuditPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Auditoría Geográfica</h1>

      <Card>
        <div className="relative h-[600px] bg-gray-200 rounded-lg">
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-600">Mapa de Auditoría</p>
          </div>

          {/* Simulated outlier markers */}
          <div className="absolute top-20 left-32 flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs bg-white px-2 py-1 rounded shadow">Outlier detectado</span>
          </div>
          <div className="absolute top-64 right-48 flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs bg-white px-2 py-1 rounded shadow">Ubicación anómala</span>
          </div>
          <div className="absolute bottom-32 left-1/3 flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-xs bg-white px-2 py-1 rounded shadow">Revisar coordenadas</span>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Anomalías Detectadas">
          <div className="space-y-3">
            {[
              { id: 1, type: "Coordenadas fuera de rango", severity: "high" },
              { id: 2, type: "Ubicación en zona no habitable", severity: "high" },
              { id: 3, type: "Duplicado de coordenadas", severity: "medium" },
              { id: 4, type: "Precisión baja en GPS", severity: "low" },
            ].map((anomaly) => (
              <div key={anomaly.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertCircle
                  className={
                    anomaly.severity === "high"
                      ? "text-red-600"
                      : anomaly.severity === "medium"
                        ? "text-yellow-600"
                        : "text-blue-600"
                  }
                  size={20}
                />
                <span className="text-sm text-gray-700">{anomaly.type}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Leyenda">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full" />
              <span className="text-sm text-gray-700">Error crítico - Requiere corrección inmediata</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full" />
              <span className="text-sm text-gray-700">Advertencia - Revisar coordenadas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-700">Información - Verificación recomendada</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-700">Validado - Datos correctos</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
