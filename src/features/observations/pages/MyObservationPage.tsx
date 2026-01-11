import { Card } from "@/shared/ui/Card"
import { Table } from "@/shared/ui/Table"
import { type Observation, ObservationStatus, ObservationType } from "@/shared/types/observation.types"

export const MyObservationsPage = () => {
  const observations: Observation[] = [
    {
      id: "1",
      type: ObservationType.CONCENTRATION,
      description: "Grupo de 15 personas",
      photos: [],
      location: { lat: 3.4516, lng: -76.532 },
      date: "2024-01-15",
      status: ObservationStatus.VALIDATED,
      userId: "1",
    },
    {
      id: "2",
      type: ObservationType.SERVICES,
      description: "Nuevo punto de alimentación",
      photos: [],
      location: { lat: 3.4516, lng: -76.532 },
      date: "2024-01-14",
      status: ObservationStatus.PENDING,
      userId: "1",
    },
  ]

  const columns = [
    { header: "Número", accessor: "id" as keyof Observation },
    { header: "Tipo", accessor: "type" as keyof Observation },
    { header: "Fecha", accessor: "date" as keyof Observation },
    {
      header: "Estado",
      accessor: (row: Observation) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            row.status === ObservationStatus.VALIDATED
              ? "bg-green-100 text-green-800"
              : row.status === ObservationStatus.PENDING
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Observaciones</h1>

      <Card>
        <Table data={observations} columns={columns} />
      </Card>
    </div>
  )
}
