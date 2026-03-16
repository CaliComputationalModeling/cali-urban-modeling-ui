import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, MoreVertical, Loader2, Check, X } from 'lucide-react'
import http from '@/services/http'
import { User } from '@/shared/types/user.types'
import { CreateUserSheet } from '../pages/CreateUserSidesheet'

const ROLE_LABELS: Record<number, string> = {
  1: "Administrador del Sistema",
  2: "Coordinador Técnico",
  3: "Equipo Técnico",
  4: "Jefe de Fundación",
  5: "Trabajador de Campo",
}

export const UserPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // ESTADOS PARA EDICIÓN INLINE
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<{nombre_completo?: string, rol_id?: number}>({})

  const fetchUsers = async () => {
    setIsLoading(true); setErrorMessage(null);
    try {
      const response = await http.get<User[]>('/users/')
      if (response.ok) setUsers(response.data)
      else setErrorMessage("No tienes permisos de administrador.")
    } catch (err) {
      console.error(err); setErrorMessage("Error de conexión.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  // Iniciar edición
  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditFormData({ nombre_completo: user.nombre_completo, rol_id: user.rol_id })
  }

  // Guardar cambios (PATCH)
  const handleSaveEdit = async (id: number) => {
    const response = await http.patch(`/users/${id}`, editFormData)
    if (response.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, ...editFormData } : u))
      setEditingId(null)
    } else {
      alert("Error al actualizar")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar operador?")) return
    const response = await http.delete(`/users/${id}`)
    if (response.ok) setUsers(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="animate-in" style={{ padding: '40px 60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '64px' }}>
        <div>
          <p style={{ color: 'var(--color-gold)', letterSpacing: '3px', fontSize: '11px', fontWeight: 700, marginBottom: '12px' }}>
            INFRAESTRUCTURA / SEGURIDAD
          </p>
          <h1 style={{ fontSize: '56px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            Gestión de <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>Operadores</span>
          </h1>
        </div>

        <button onClick={() => setIsSheetOpen(true)} className="submit-button" style={{ width: 'auto', padding: '16px 32px', borderRadius: '14px' }}>
          <Plus size={20} /> Registrar Operador
        </button>
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={48} color="var(--color-accent)" /></div>
      ) : errorMessage ? (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b' }}>
          {errorMessage}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>IDENTIFICADOR</th>
                <th>NOMBRE COMPLETO</th>
                <th>CORREO ELECTRÓNICO</th>
                <th>NIVEL DE ACCESO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingId === user.id;
                return (
                  <tr key={user.id} style={{ backgroundColor: isEditing ? '#f0faff' : 'transparent' }}>
                    <td className="mono-id">#{user.id.toString().padStart(3, '0')}</td>
                    
                    {/* Celda Nombre */}
                    <td>
                      {isEditing ? (
                        <input 
                          value={editFormData.nombre_completo}
                          onChange={e => setEditFormData({...editFormData, nombre_completo: e.target.value})}
                          style={{ padding: '8px 12px', border: '1px solid var(--color-accent)', borderRadius: '6px', width: '100%' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{user.nombre_completo}</span>
                      )}
                    </td>

                    <td style={{ color: 'var(--color-text-muted)' }}>{user.email}</td>

                    {/* Celda Rol */}
                    <td>
                      {isEditing ? (
                        <select 
                          value={editFormData.rol_id}
                          onChange={e => setEditFormData({...editFormData, rol_id: Number(e.target.value)})}
                          style={{ padding: '8px', border: '1px solid var(--color-accent)', borderRadius: '6px' }}
                        >
                          {Object.entries(ROLE_LABELS).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className={`role-tag role-${user.rol_id}`}>
                          <Shield size={12} /> {ROLE_LABELS[user.rol_id]}
                        </div>
                      )}
                    </td>

                    {/* Acciones Inline */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(user.id)} className="icon-btn" style={{ color: '#10b981' }}><Check size={20} /></button>
                            <button onClick={() => setEditingId(null)} className="icon-btn" style={{ color: '#ef4444' }}><X size={20} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(user)} className="icon-btn"><MoreVertical size={18} /></button>
                            <button onClick={() => handleDelete(user.id)} className="icon-btn delete"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} onSuccess={fetchUsers} />
    </div>
  )
}