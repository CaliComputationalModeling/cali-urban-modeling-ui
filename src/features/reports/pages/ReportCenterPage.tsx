import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Table } from "@/shared/ui/Table"
import { Download, Plus } from "lucide-react"

interface Report {
  id: string
  name: string
  date: string
  type: string
}

export const ReportCenterPage = () => {
  const reports: Report[] = [
    { id: "1", name: "Informe Trimestral Q1 2024", date: "2024-01-15", type: "Ejecutivo" },
    { id: "2", name: "Análisis de Validación SIM-001", date: "2024-01-14", type: "Técnico" },
    { id: "3", name: "Reporte de Observaciones", date: "2024-01-10", type: "Campo" },
  ]

  const columns = [
    { header: "Nombre", accessor: "name" as keyof Report },
    { header: "Fecha", accessor: "date" as keyof Report },
    { header: "Tipo", accessor: "type" as keyof Report },
    {
      header: "Acciones",
      accessor: (row: Report) => (
        <Button size="sm" variant="secondary">
          <Download size={16} className="mr-1" />
          Descargar
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
        <Button>
          <Plus size={20} className="mr-2" />
          Generar Nuevo Reporte
        </Button>
      </div>

      <Card>
        <Table data={reports} columns={columns} />
      </Card>
    </div>
  )
}
