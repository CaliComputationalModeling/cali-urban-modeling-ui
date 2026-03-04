import { useEffect } from "react"
import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/app/router"
import { useSimulationStore } from "@/store/simulationStore"

export const App = () => {
  const { addLog } = useSimulationStore()

  useEffect(() => {
    // Inicializar logs del sistema
    addLog("Aplicación iniciada", "info")
  }, [])

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
