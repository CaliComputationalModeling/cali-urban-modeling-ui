import React, { useState } from 'react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import http from '@/services/http';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserSheet: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol_id: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { ok } = await http.post('/auth/register', formData);
      if (ok) {
        onSuccess();
        onClose();
        setFormData({ email: '', password: '', nombre_completo: '', rol_id: 5 });
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
          {/* Overlay - Bloquea el fondo y oscurece */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 12, 16, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 998
            }}
          />

          {/* Panel Lateral Deslizante */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              height: '100vh',
              width: '100%',
              maxWidth: '450px',
              backgroundColor: '#ffffff',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 50px rgba(0,0,0,0.3)',
              color: '#1a3a52'
            }}
          >
            {/* Header del SideSheet */}
            <div style={{ padding: '40px', borderBottom: '1px solid #f1f3f5', backgroundColor: '#f8f9fa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '2px', marginBottom: '8px' }}>
                    SISTEMA_OPERATIVO / SEGURIDAD
                  </p>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontStyle: 'italic', margin: 0 }}>
                    Nuevo Operador
                  </h2>
                </div>
                <button 
                  onClick={onClose}
                  style={{ background: '#eee', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} color="#666" />
                </button>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} style={{ padding: '40px', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>
                  NOMBRE COMPLETO
                </label>
                <input
                  required
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px' }}
                  placeholder="Ej. David Gutierrez"
                  onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>
                  EMAIL CORPORATIVO
                </label>
                <input
                  required
                  type="email"
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px' }}
                  placeholder="usuario@simcore.io"
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>
                  CONTRASEÑA DE ACCESO
                </label>
                <input
                  required
                  type="password"
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px' }}
                  placeholder="••••••••"
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>
                  NIVEL DE AUTORIZACIÓN
                </label>
                <select
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', cursor: 'pointer' }}
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
                disabled={isLoading}
                type="submit"
                style={{
                  width: '100%',
                  padding: '18px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 10px 20px rgba(0, 217, 255, 0.2)'
                }}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                Crear Usuario
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};