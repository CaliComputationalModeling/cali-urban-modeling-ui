import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Shield,
  MoreVertical,
  Loader2,
  Check,
  X,
  Users,
  AlertTriangle,
  Power,
} from 'lucide-react'
import { toast } from 'sonner'
import { userEndpoints } from '@/services/endpoints'
import { User } from '@/shared/types/user.types'
import { CreateUserSheet } from './CreateUserSidesheet'

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
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

type ConfirmAction = { type: 'delete'; user: User } | { type: 'toggle'; user: User }

const ConfirmModal: React.FC<{
  action: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
}> = ({ action, onConfirm, onCancel }) => {
  const isDelete = action.type === 'delete'
  const isActive = action.user.activo !== false
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${isDelete ? '' : 'modal-icon-warning'}`}>
          {isDelete ? <AlertTriangle size={22} /> : <Power size={22} />}
        </div>
        <h3 className="modal-title">
          {isDelete ? 'Eliminar operador' : isActive ? 'Desactivar operador' : 'Activar operador'}
        </h3>
        <p className="modal-subtitle">
          {isDelete ? (
            <>
              ¿Estás seguro de que quieres eliminar a <strong>{action.user.nombre_completo}</strong>?
              Esta acción no se puede deshacer.
            </>
          ) : isActive ? (
            <>
              ¿Desactivar el acceso de <strong>{action.user.nombre_completo}</strong> al sistema?
              El operador no podrá iniciar sesión.
            </>
          ) : (
            <>
              ¿Reactivar el acceso de <strong>{action.user.nombre_completo}</strong> al sistema?
              El operador podrá iniciar sesión nuevamente.
            </>
          )}
        </p>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={isDelete ? 'modal-btn-delete' : 'modal-btn-confirm'}
            onClick={onConfirm}
          >
            {isDelete ? 'Eliminar' : isActive ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const UserPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<{ nombre_completo?: string; rol_id?: number }>({})

  const fetchUsers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    const response = await userEndpoints.getAll()
    if (response.ok) {
      setUsers(response.data)
    } else {
      setErrorMessage('No tienes permisos de administrador.')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditFormData({ nombre_completo: user.nombre_completo, rol_id: user.rol_id })
  }

  const handleSaveEdit = async (id: number) => {
    const prev = users.find((u) => u.id === id)
    if (!prev) return

    // Optimistic update
    setUsers(users.map((u) => (u.id === id ? { ...u, ...editFormData } : u)))
    setEditingId(null)

    const response = await userEndpoints.update(id, editFormData)
    if (response.ok) {
      toast.success('Operador actualizado correctamente')
    } else {
      // Rollback
      setUsers(users.map((u) => (u.id === id ? prev : u)))
      toast.error('Error al actualizar el operador')
    }
  }

  const handleDelete = async () => {
    if (!confirmAction || confirmAction.type !== 'delete') return
    const target = confirmAction.user

    // Optimistic remove
    const prevUsers = [...users]
    setUsers(users.filter((u) => u.id !== target.id))
    setConfirmAction(null)

    const response = await userEndpoints.delete(target.id)
    if (response.ok) {
      toast.success(`${target.nombre_completo} fue eliminado del sistema`)
    } else {
      // Rollback
      setUsers(prevUsers)
      toast.error('Error al eliminar el operador')
    }
  }

  const handleToggleStatus = async () => {
    if (!confirmAction || confirmAction.type !== 'toggle') return
    const target = confirmAction.user

    // Optimistic toggle
    const prevUsers = [...users]
    const wasActive = target.activo !== false
    setUsers(
      users.map((u) => (u.id === target.id ? { ...u, activo: !wasActive } : u)),
    )
    setConfirmAction(null)

    const response = await userEndpoints.toggleStatus(target.id)
    if (response.ok) {
      toast.success(
        wasActive
          ? `${target.nombre_completo} fue desactivado`
          : `${target.nombre_completo} fue reactivado`,
      )
    } else {
      // Rollback
      setUsers(prevUsers)
      toast.error('Error al cambiar el estado del operador')
    }
  }

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'delete') handleDelete()
    else handleToggleStatus()
  }

  // Stats
  const totalUsers = users.length
  const activeCount = users.filter((u) => u.activo !== false).length
  const adminCount = users.filter((u) => u.rol_id === 1).length
  const fieldCount = users.filter((u) => u.rol_id === 5).length

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
            <div className="stat-icon accent">
              <Users size={20} />
            </div>
            <div>
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">Total operadores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Power size={20} />
            </div>
            <div>
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">Activos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent">
              <Shield size={20} />
            </div>
            <div>
              <div className="stat-value">{adminCount}</div>
              <div className="stat-label">Administradores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon muted">
              <Users size={20} />
            </div>
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
          <Loader2
            size={40}
            color="var(--color-accent)"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
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
            <div className="empty-state-icon">
              <Users size={28} />
            </div>
            <p className="empty-state-title">Sin operadores registrados</p>
            <p className="empty-state-subtitle">
              Registra el primer operador usando el botón superior.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-card desktop-only">
            <table className="user-table-custom">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Operador</th>
                  <th>Correo</th>
                  <th>Nivel de Acceso</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isEditing = editingId === user.id
                  const isActive = user.activo !== false
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
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, nombre_completo: e.target.value })
                            }
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
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, rol_id: Number(e.target.value) })
                            }
                          >
                            {Object.entries(ROLE_LABELS).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
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
                        <span className={`status-pill ${isActive ? 'status-active' : 'status-inactive'}`}>
                          <span className="status-dot" />
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="action-group">
                          {isEditing ? (
                            <>
                              <button
                                className="icon-btn confirm"
                                onClick={() => handleSaveEdit(user.id)}
                                title="Guardar"
                              >
                                <Check size={17} />
                              </button>
                              <button
                                className="icon-btn cancel"
                                onClick={() => setEditingId(null)}
                                title="Cancelar"
                              >
                                <X size={17} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="icon-btn"
                                onClick={() => startEdit(user)}
                                title="Editar"
                              >
                                <MoreVertical size={16} />
                              </button>
                              <button
                                className="icon-btn toggle"
                                onClick={() => setConfirmAction({ type: 'toggle', user })}
                                title={isActive ? 'Desactivar' : 'Activar'}
                              >
                                <Power size={16} />
                              </button>
                              <button
                                className="icon-btn delete"
                                onClick={() => setConfirmAction({ type: 'delete', user })}
                                title="Eliminar"
                              >
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

          {/* Mobile Card View */}
          <div className="user-cards mobile-only">
            {users.map((user) => {
              const isActive = user.activo !== false
              return (
                <div key={user.id} className="user-card">
                  <div className="user-card-header">
                    <div className="user-cell">
                      <div className={`user-avatar avatar-${user.rol_id}`}>
                        {getInitials(user.nombre_completo)}
                      </div>
                      <div>
                        <div className="user-name-cell">{user.nombre_completo}</div>
                        <span className="user-email-cell">{user.email}</span>
                      </div>
                    </div>
                    <span
                      className={`status-pill ${isActive ? 'status-active' : 'status-inactive'}`}
                    >
                      <span className="status-dot" />
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="user-card-body">
                    <div className="user-card-field">
                      <span className="user-card-label">ID</span>
                      <span className="mono-id">#{user.id.toString().padStart(3, '0')}</span>
                    </div>
                    <div className="user-card-field">
                      <span className="user-card-label">Rol</span>
                      <span className={`role-tag role-${user.rol_id}`}>
                        <Shield size={10} />
                        {ROLE_LABELS[user.rol_id]}
                      </span>
                    </div>
                  </div>

                  <div className="user-card-actions">
                    <button
                      className="icon-btn"
                      onClick={() => startEdit(user)}
                      title="Editar"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <button
                      className="icon-btn toggle"
                      onClick={() => setConfirmAction({ type: 'toggle', user })}
                      title={isActive ? 'Desactivar' : 'Activar'}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => setConfirmAction({ type: 'delete', user })}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
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
