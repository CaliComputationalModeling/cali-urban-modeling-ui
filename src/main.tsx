import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "@/App"
import "@/styles/index.css"
import "@/App.css"
import "./styles/index.css"

// Inicializar HTTP Client con interceptores
import { setupHttpInterceptors } from "@/services/http/index"
setupHttpInterceptors()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
