import React, { useState } from 'react';
import { X, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import http from '@/services/http';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getPasswordStrength(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  return { level: score, label: labels[score] };
}

export const CreateUserSheet: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol_id: 5,
  });

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { ok } = await http.post('/auth/register', formData);
      if (ok) {
        onSuccess();
        onClose();
        setFormData({ email: '', password: '', nombre_completo: '', rol_id: 5 });
        setShowPassword(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="sidesheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <button className="sidesheet-close" onClick={onClose} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="sidesheet-body">
              <div className="sheet-form-group">
                <label className="sheet-form-label">Nombre Completo</label>
                <input
                  required
                  className="sheet-input"
                  placeholder="Ej. David Gutiérrez"
                  value={formData.nombre_completo}
                  onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                />
              </div>

              <div className="sheet-form-group">
                <label className="sheet-form-label">Email Corporativo</label>
                <input
                  required
                  type="email"
                  className="sheet-input"
                  placeholder="usuario@simcore.io"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="sheet-form-group">
                <label className="sheet-form-label">Contraseña de Acceso</label>
                <div className="password-wrapper">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="sheet-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
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
                {formData.password && (
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
                  className="sheet-select"
                  value={formData.rol_id}
                  onChange={e => setFormData({ ...formData, rol_id: Number(e.target.value) })}
                >
                  <option value={1}>Administrador del Sistema</option>
                  <option value={2}>Coordinador Técnico</option>
                  <option value={3}>Equipo Técnico</option>
                  <option value={4}>Jefe de Fundación</option>
                  <option value={5}>Trabajador de Campo</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="sheet-submit"
              >
                {isLoading
                  ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Creando...</>
                  : <><ShieldCheck size={18} /> Crear Operador</>
                }
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};