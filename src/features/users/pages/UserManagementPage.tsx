"use client"

import { useState } from "react"
import { Card } from "@/shared/ui/Card"
import { Button } from "@/shared/ui/Button"
import { Table } from "@/shared/ui/Table"
import { Modal } from "@/shared/ui/Modal"
import { Input } from "@/shared/ui/Input"
import { type User, UserRole, UserStatus } from "@/shared/types/user.types"
import { Plus, Edit2, UserX } from "lucide-react"

export const UserManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [users] = useState<User[]>([
    { id: "1", name: "Juan Pérez", email: "juan@example.com", role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    { id: "2", name: "María García", email: "maria@example.com", role: UserRole.TECHNICIAN, status: UserStatus.ACTIVE },
    {
      id: "3",
      name: "Carlos López",
      email: "carlos@example.com",
      role: UserRole.FIELD_WORKER,
      status: UserStatus.ACTIVE,
    },
  ])

  const columns = [
    { header: "Nombre", accessor: "name" as keyof User },
    { header: "Email", accessor: "email" as keyof User },
    {
      header: "Rol",
      accessor: (row: User) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">{row.role}</span>
      ),
    },
    {
      header: "Estado",
      accessor: (row: User) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            row.status === UserStatus.ACTIVE ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Acciones",
      accessor: (row: User) => (
        <div className="flex gap-2">
          <button className="text-primary-600 hover:text-primary-800">
            <Edit2 size={18} />
          </button>
          <button className="text-red-600 hover:text-red-800">
            <UserX size={18} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" />
          Crear Usuario
        </Button>
      </div>

      <Card>
        <Table data={users} columns={columns} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Usuario"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Crear Usuario</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nombre completo" placeholder="Ingrese el nombre" />
          <Input label="Email" type="email" placeholder="usuario@ejemplo.com" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Administrador</option>
              <option>Técnico</option>
              <option>Trabajador de Campo</option>
              <option>Visualizador</option>
            </select>
          </div>
          <Input label="Contraseña" type="password" placeholder="••••••••" />
        </div>
      </Modal>
    </div>
  )
}
