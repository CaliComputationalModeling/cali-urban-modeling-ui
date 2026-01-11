import { Card } from "@/shared/ui/Card"
import { Table } from "@/shared/ui/Table"
import { type Simulation, SimulationStatus } from "../../../shared/types/simulation.types"

export const SimulationHistoryPage = () => {
  const simulations: Simulation[] = [
    {
      id: "SIM-001",
      version: "v1.2.3",
      date: "2024-01-15",
      status: SimulationStatus.APPROVED,
      parameters: { climate: 50, security: 50, services: 50, mobility: 50, cellSize: "20x20m", depth: 100 },
    },
    {
      id: "SIM-002",
      version: "v1.2.4",
      date: "2024-01-14",
      status: SimulationStatus.COMPLETED,
      parameters: { climate: 60, security: 40, services: 70, mobility: 55, cellSize: "20x20m", depth: 100 },
    },
    {
      id: "SIM-003",
      version: "v1.2.2",
      date: "2024-01-13",
      status: SimulationStatus.ERROR,
      parameters: { climate: 45, security: 55, services: 50, mobility: 50, cellSize: "10x10m", depth: 150 },
    },
  ]

  const columns = [
    { header: "ID", accessor: "id" as keyof Simulation },
    { header: "Versión", accessor: "version" as keyof Simulation },
    { header: "Fecha", accessor: "date" as keyof Simulation },
    {
      header: "Estado",
      accessor: (row: Simulation) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            row.status === SimulationStatus.APPROVED
              ? "bg-green-100 text-green-800"
              : row.status === SimulationStatus.COMPLETED
                ? "bg-blue-100 text-blue-800"
                : row.status === SimulationStatus.RUNNING
                  ? "bg-yellow-100 text-yellow-800"
                  : row.status === SimulationStatus.ERROR
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Historial de Simulaciones</h1>

      <Card>
        <Table data={simulations} columns={columns} />
      </Card>
    </div>
  )
}
