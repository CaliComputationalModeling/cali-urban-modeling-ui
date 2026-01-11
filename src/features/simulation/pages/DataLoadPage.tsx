import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Upload, Database } from "lucide-react"

export const DataLoadPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Carga de Datos</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Datos de Censo">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 cursor-pointer transition-colors">
              <Upload className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-sm text-gray-600">Arrastra archivos CSV o haz clic para seleccionar</p>
            </div>
            <Button className="w-full">
              <Database size={20} className="mr-2" />
              Cargar Datos de Censo
            </Button>
          </div>
        </Card>

        <Card title="Datos GIS">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 cursor-pointer transition-colors">
              <Upload className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-sm text-gray-600">Formatos: GeoJSON, Shapefile</p>
            </div>
            <Button className="w-full">
              <Database size={20} className="mr-2" />
              Cargar Datos GIS
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Registro de Actividad">
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
          <p>[2024-01-15 10:30:15] Sistema iniciado</p>
          <p>[2024-01-15 10:30:20] Cargando datos de censo...</p>
          <p>[2024-01-15 10:30:45] ✓ Datos de censo cargados: 15,234 registros</p>
          <p>[2024-01-15 10:31:00] Procesando datos GIS...</p>
          <p>[2024-01-15 10:31:30] ✓ Datos GIS procesados correctamente</p>
          <p>[2024-01-15 10:31:35] Sistema listo para simulación</p>
        </div>
      </Card>
    </div>
  )
}
