import type { Cell } from "@/shared/types/simulation.types"

interface GridViewerProps {
  cells: Cell[]
  gridSize?: { width: number; height: number }
  cellSize?: number // tamaño del cuadro en píxeles
}

export const GridViewer = ({
  cells,
  gridSize = { width: 50, height: 50 },
  cellSize = 10,
}: GridViewerProps) => {
  // Crear matriz 2D para visualización rápida
  const grid = Array(gridSize.height)
    .fill(null)
    .map(() => Array(gridSize.width).fill(0))

  // Poblar el grid con el estado de celdas
  cells.forEach((cell) => {
    if (cell.position.y < gridSize.height && cell.position.x < gridSize.width) {
      grid[cell.position.y][cell.position.x] = cell.state
    }
  })

  return (
    <div className="inline-block border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize.width}, ${cellSize}px)`, gap: "1px" }}>
        {grid.map((row, y) =>
          row.map((state, x) => (
            <div
              key={`${x}-${y}`}
              className={`transition-colors ${
                state === 1
                  ? "bg-primary-600 hover:bg-primary-700"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
              }}
              title={`Celda (${x}, ${y}) = ${state}`}
            />
          ))
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600 p-2">
        <p>Total celdas: {cells.length}</p>
        <p>Ocupadas: {cells.filter((c) => c.state === 1).length}</p>
        <p>Vacías: {cells.filter((c) => c.state === 0).length}</p>
      </div>
    </div>
  )
}
