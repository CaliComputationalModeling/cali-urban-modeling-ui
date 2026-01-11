"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Save, Play } from "lucide-react"

export const RulesEditorPage = () => {
  const [code] = useState(`// Reglas del Autómata Celular

function transitionRule(cell, neighbors) {
  const occupiedNeighbors = neighbors.filter(n => n.occupied).length;
  
  // Regla 1: Si hay más de 3 vecinos ocupados, la celda se libera
  if (occupiedNeighbors > 3) {
    return { ...cell, occupied: false };
  }
  
  // Regla 2: Si hay exactamente 2-3 vecinos, mantener estado
  if (occupiedNeighbors >= 2 && occupiedNeighbors <= 3) {
    return cell;
  }
  
  // Regla 3: Factores externos
  const servicesFactor = calculateServices(cell.position);
  const securityFactor = calculateSecurity(cell.position);
  
  if (servicesFactor > 0.7 && securityFactor > 0.5) {
    return { ...cell, occupied: true, density: occupiedNeighbors };
  }
  
  return { ...cell, occupied: false };
}`)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Editor de Reglas</h1>

      <Card title="Código del Autómata Celular">
        <div className="space-y-4">
          <textarea
            value={code}
            readOnly
            className="w-full h-96 p-4 bg-gray-900 text-green-400 font-mono text-sm rounded-lg"
          />

          <div className="flex gap-3">
            <Button>
              <Save size={20} className="mr-2" />
              Guardar Reglas
            </Button>

            <Button variant="secondary">
              <Play size={20} className="mr-2" />
              Probar Reglas
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Documentación">
        <ul className="text-sm text-gray-700 space-y-1">
          <li><code>calculateServices(position)</code></li>
          <li><code>calculateSecurity(position)</code></li>
          <li><code>getNeighbors(cell)</code></li>
          <li><code>applyClimate(cell, factor)</code></li>
        </ul>
      </Card>
    </div>
  )
}
