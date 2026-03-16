import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, MoreVertical, Loader2, Check, X, Users, AlertTriangle } from 'lucide-react'
import http from '@/services/http'
import { User } from '@/shared/types/user.types'
import { CreateUserSheet } from '../pages/CreateUserSidesheet'

const ROLE_LABELS: Record<number, string> = {
  1: 'Administrador',
  2: 'Coordinador Técnico',
  3: 'Equipo Técnico',
  4: 'Jefe de Fundación',
  5: 'Trabajador de Campo',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

interface DeleteModalProps {
  user: User
  onConfirm: () => void
  onCancel: () => void
}

const DeleteModal: React.FC<DeleteModalProps> = ({ user, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <div className="modal-icon">
        <AlertTriangle size={22} />
      </div>
      <h3 className="modal-title">Eliminar operador</h3>
      <p className="modal-subtitle">
        ¿Estás seguro de que quieres eliminar a <strong>{user.nombre_completo}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <div className="modal-actions">
        <button className="modal-btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="modal-btn-delete" onClick={onConfirm}>Eliminar</button>
      </div>
    </div>
  </div>
)

export const UserPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<{ nombre_completo?: string; rol_id?: number }>({})

  const fetchUsers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await http.get<User[]>('/users/')
      if (response.ok) setUsers(response.data)
      else setErrorMessage('No tienes permisos de administrador.')
    } catch {
      setErrorMessage('Error de conexión.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditFormData({ nombre_completo: user.nombre_completo, rol_id: user.rol_id })
  }

  const handleSaveEdit = async (id: number) => {
    const response = await http.patch(`/users/${id}`, editFormData)
    if (response.ok) {
      setUsers(users.map(u => u.id === id ? { ...u, ...editFormData } : u))
      setEditingId(null)
    } else {
      alert('Error al actualizar')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const response = await http.delete(`/users/${deleteTarget.id}`)
    if (response.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
  }

  // Stats
  const totalUsers = users.length
  const adminCount = users.filter(u => u.rol_id === 1).length
  const coordCount = users.filter(u => u.rol_id === 2).length
  const fieldCount = users.filter(u => u.rol_id === 5).length

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Infraestructura / Seguridad</p>
          <h1 className="page-title">
            Gestión de <em>Operadores</em>
          </h1>
        </div>
        <button className="action-button" onClick={() => setIsSheetOpen(true)}>
          <Plus size={18} />
          Registrar Operador
        </button>
      </div>

      {/* Stats Row */}
      {!isLoading && !errorMessage && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon accent"><Users size={20} /></div>
            <div>
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">Total operadores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent"><Shield size={20} /></div>
            <div>
              <div className="stat-value">{adminCount}</div>
              <div className="stat-label">Administradores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gold"><Shield size={20} /></div>
            <div>
              <div className="stat-value">{coordCount}</div>
              <div className="stat-label">Coordinadores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon muted"><Users size={20} /></div>
            <div>
              <div className="stat-value">{fieldCount}</div>
              <div className="stat-label">Campo</div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="loading-state">
          <Loader2 size={40} color="var(--color-accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
          <p className="loading-text">CARGANDO OPERADORES</p>
        </div>
      ) : errorMessage ? (
        <div className="error-state">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          {errorMessage}
        </div>
      ) : users.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <p className="empty-state-title">Sin operadores registrados</p>
            <p className="empty-state-subtitle">Registra el primer operador usando el botón superior.</p>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Operador</th>
                <th>Correo</th>
                <th>Nivel de Acceso</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingId === user.id
                return (
                  <tr key={user.id} className={isEditing ? 'editing' : ''}>
                    <td>
                      <span className="mono-id">#{user.id.toString().padStart(3, '0')}</span>
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          className="inline-input"
                          value={editFormData.nombre_completo}
                          onChange={e => setEditFormData({ ...editFormData, nombre_completo: e.target.value })}
                        />
                      ) : (
                        <div className="user-cell">
                          <div className={`user-avatar avatar-${user.rol_id}`}>
                            {getInitials(user.nombre_completo)}
                          </div>
                          <div>
                            <div className="user-name-cell">{user.nombre_completo}</div>
                          </div>
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="user-email-cell">{user.email}</span>
                    </td>

                    <td>
                      {isEditing ? (
                        <select
                          className="inline-select"
                          value={editFormData.rol_id}
                          onChange={e => setEditFormData({ ...editFormData, rol_id: Number(e.target.value) })}
                        >
                          {Object.entries(ROLE_LABELS).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`role-tag role-${user.rol_id}`}>
                          <Shield size={10} />
                          {ROLE_LABELS[user.rol_id]}
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="action-group">
                        {isEditing ? (
                          <>
                            <button className="icon-btn confirm" onClick={() => handleSaveEdit(user.id)} title="Guardar">
                              <Check size={17} />
                            </button>
                            <button className="icon-btn cancel" onClick={() => setEditingId(null)} title="Cancelar">
                              <X size={17} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="icon-btn" onClick={() => startEdit(user)} title="Editar">
                              <MoreVertical size={16} />
                            </button>
                            <button className="icon-btn delete" onClick={() => setDeleteTarget(user)} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <CreateUserSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  )
}