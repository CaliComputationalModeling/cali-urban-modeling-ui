import { Card } from "@/shared/ui/Card"

export const PredictiveRoutesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rutas Predictivas</h1>

      <Card>
        <div className="relative h-[600px] bg-gray-200 rounded-lg">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <p className="text-xl font-semibold mb-2">Rutas Estimadas</p>
              <p className="text-sm">Predicciones basadas en autómatas celulares</p>
            </div>
          </div>

          {/* Simulated route lines */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
            <path
              d="M 100 300 Q 200 200 400 250"
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 300 400 Q 400 350 500 300"
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 500 500 Q 550 400 600 350"
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        </div>
      </Card>
    </div>
  )
}
