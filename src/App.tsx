import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "@/app/router"

export const App = () => {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
