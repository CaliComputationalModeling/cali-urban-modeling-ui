import { useEffect, useState } from 'react'
import { Shield, Loader2, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { roleEndpoints, type Role } from '@/services/endpoints'

export const RolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })

  const fetchRoles = async () => {
    setIsLoading(true)
    const res = await roleEndpoints.getAll()
    if (res.ok) setRoles(res.data)
    else toast.error('No fue posible cargar roles')
    setIsLoading(false)
  }

  useEffect(() => {
    fetchRoles().catch(() => null)
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ nombre: '', descripcion: '' })
  }

  const submit = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre del rol es obligatorio')
      return
    }

    const res = editingId
      ? await roleEndpoints.update(editingId, form)
      : await roleEndpoints.create(form)

    if (res.ok) {
      toast.success(editingId ? 'Rol actualizado' : 'Rol creado')
      resetForm()
      fetchRoles().catch(() => null)
    } else {
      toast.error('No fue posible guardar el rol')
    }
  }

  const startEdit = (role: Role) => {
    setEditingId(role.id)
    setForm({ nombre: role.nombre, descripcion: role.descripcion ?? '' })
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Infraestructura / Seguridad</p>
          <h1 className="page-title">Roles</h1>
        </div>
      </div>

      <section className="table-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="sheet-form-label">Nombre</label>
            <input className="sheet-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="sheet-form-label">Descripcion</label>
            <input className="sheet-input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <button className="action-button" onClick={submit}>
            {editingId ? <Save size={18} /> : <Plus size={18} />}
            {editingId ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </section>

      <section className="table-card">
        {isLoading ? (
          <div className="loading-state">
            <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="loading-text">CARGANDO ROLES</p>
          </div>
        ) : (
          <table className="user-table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Rol</th>
                <th>Descripcion</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td><span className="mono-id">#{role.id}</span></td>
                  <td>
                    <span className="role-tag role-1"><Shield size={10} />{role.nombre}</span>
                  </td>
                  <td>{role.descripcion ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" onClick={() => startEdit(role)} title="Editar">
                      <Save size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
