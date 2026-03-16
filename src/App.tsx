import { useEffect } from "react"
import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/app/router"

export const App = () => {

  useEffect(() => {
    // Inicializar logs del sistema
  }, [])

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
