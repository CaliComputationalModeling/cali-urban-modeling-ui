import React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { userEndpoints } from '@/services/endpoints'

const createUserSchema = z.object({
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  rol_id: z.coerce.number().min(1).max(5),
})

type CreateUserForm = z.infer<typeof createUserSchema>

function getPasswordStrength(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  return { level: score, label: labels[score] }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateUserSheet: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { nombre_completo: '', email: '', password: '', rol_id: 5 },
  })

  const passwordValue = watch('password')
  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data: CreateUserForm) => {
    const response = await userEndpoints.create(data)
    if (response.ok) {
      toast.success('Operador creado exitosamente')
      reset()
      setShowPassword(false)
      onSuccess()
      onClose()
    } else {
      const detail =
        response.data && typeof response.data === 'object' && 'detail' in response.data
          ? String((response.data as { detail: unknown }).detail)
          : 'Error al crear el operador'
      toast.error(detail)
    }
  }

  const handleClose = () => {
    reset()
    setShowPassword(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="sidesheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="sidesheet-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            {/* Header */}
            <div className="sidesheet-header">
              <p className="sidesheet-eyebrow">Sistema Operativo / Seguridad</p>
              <div className="sidesheet-title-row">
                <h2 className="sidesheet-title">Nuevo Operador</h2>
                <button className="sidesheet-close" onClick={handleClose} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="sidesheet-body">
              <div className="sheet-form-group">
                <label className="sheet-form-label">Nombre Completo</label>
                <input
                  {...register('nombre_completo')}
                  className="sheet-input"
                  placeholder="Ej. David Gutiérrez"
                  disabled={isSubmitting}
                />
                {errors.nombre_completo && (
                  <p className="sheet-field-error">{errors.nombre_completo.message}</p>
                )}
              </div>

              <div className="sheet-form-group">
                <label className="sheet-form-label">Email Corporativo</label>
                <input
                  {...register('email')}
                  type="email"
                  className="sheet-input"
                  placeholder="usuario@simcore.io"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="sheet-field-error">{errors.email.message}</p>}
              </div>

              <div className="sheet-form-group">
                <label className="sheet-form-label">Contraseña de Acceso</label>
                <div className="password-wrapper">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="sheet-input"
                    placeholder="••••••••"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="sheet-field-error">{errors.password.message}</p>}
                {passwordValue && (
                  <div className="password-strength">
                    <div className="strength-bar-track">
                      <div className={`strength-bar-fill strength-${strength.level}`} />
                    </div>
                    <span className="strength-label">{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="sheet-form-group" style={{ marginBottom: 40 }}>
                <label className="sheet-form-label">Nivel de Autorización</label>
                <select
                  {...register('rol_id')}
                  className="sheet-select"
                  disabled={isSubmitting}
                >
                  <option value={1}>Administrador del Sistema</option>
                  <option value={2}>Coordinador Técnico</option>
                  <option value={3}>Equipo Técnico</option>
                  <option value={4}>Jefe de Fundación</option>
                  <option value={5}>Trabajador de Campo</option>
                </select>
                {errors.rol_id && <p className="sheet-field-error">{errors.rol_id.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="sheet-submit">
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />{' '}
                    Creando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Crear Operador
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
