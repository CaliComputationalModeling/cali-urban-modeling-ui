import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const AccessDenied = () => {
  const navigate = useNavigate()

  return (
    <div className="access-denied">
      <div className="access-denied-icon">
        <ShieldOff size={32} />
      </div>
      <h2 className="access-denied-title">Acceso Restringido</h2>
      <p className="access-denied-subtitle">
        No tienes los permisos necesarios para acceder a esta sección.
        Contacta a un administrador si crees que es un error.
      </p>
      <button className="access-denied-btn" onClick={() => navigate('/dashboard')}>
        Volver al Panel
      </button>
    </div>
  )
}
