import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { getInitials } from '../lib/utils'
import { Settings as SettingsIcon, User, Shield, CheckCircle, Users, Plus, Pencil, UserX, X, Eye, EyeOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { toast } from 'sonner'
import type { User as UserType } from '../types'


// ── User modal ────────────────────────────────────────────────────────────────

const ROLES = ['GERENTE', 'VENTAS', 'LOGISTICA', 'CONTADORA'] as const
const ROLE_LABELS: Record<string, string> = { GERENTE: 'Gerente', VENTAS: 'Ventas', LOGISTICA: 'Logística', CONTADORA: 'Contadora' }

interface UserFormData {
  name: string
  email: string
  password: string
  role: string
  whatsapp: string
  cedula: string
}

function UserModal({
  editUser,
  onClose,
}: {
  editUser: UserType | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editUser
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState<UserFormData>({
    name: editUser?.name ?? '',
    email: editUser?.email ?? '',
    password: '',
    role: editUser?.role ?? 'VENTAS',
    whatsapp: editUser?.whatsapp ?? '',
    cedula: editUser?.cedula ?? '',
  })

  const set = (k: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, whatsapp: form.whatsapp, cedula: form.cedula }
        if (form.password) payload.password = form.password
        return usersApi.update(editUser!.id, payload as Parameters<typeof usersApi.update>[1])
      }
      return usersApi.create({ name: form.name, email: form.email, password: form.password, role: form.role, whatsapp: form.whatsapp, cedula: form.cedula })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error al guardar usuario')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || (!isEdit && !form.password)) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    save.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={set('name')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="juan@maral.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Contraseña {isEdit && <span className="text-gray-400">(dejar vacío para no cambiar)</span>}
              {!isEdit && '*'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={set('whatsapp')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="3167760692"
            />
            <p className="text-[10px] text-gray-400 mt-1">Solo dígitos, sin indicativo país</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cédula</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.cedula}
              onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value.replace(/\D/g, '') }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1234567890"
            />
            <p className="text-[10px] text-gray-400 mt-1">Usada para iniciar sesión (tarjeta de usuario)</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {save.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Users section ─────────────────────────────────────────────────────────────

function UsersSection({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState<null | 'new' | UserType>(null)

  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario desactivado') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Error al desactivar')
    },
  })

  const reactivate = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { active: true } as Parameters<typeof usersApi.update>[1]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario reactivado') },
    onError: () => toast.error('Error al reactivar'),
  })

  return (
    <>
      {modal && (
        <UserModal
          editUser={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          Usuarios del sistema
        </h2>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={13} />
          Nuevo usuario
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-4">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                u.active ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                u.active ? 'bg-blue-500' : 'bg-gray-400'
              }`}>
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {u.name}
                  {!u.active && <span className="ml-2 text-xs text-gray-400 font-normal">Inactivo</span>}
                </p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                u.role === 'GERENTE' ? 'bg-purple-100 text-purple-700'
                : u.role === 'VENTAS' ? 'bg-blue-100 text-blue-700'
                : 'bg-orange-100 text-orange-700'
              }`}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
              {u.id !== currentUserId && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal(u)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  {u.active ? (
                    <button
                      onClick={() => { if (confirm(`¿Desactivar a ${u.name}?`)) deactivate.mutate(u.id) }}
                      disabled={deactivate.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desactivar"
                    >
                      <UserX size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivate.mutate(u.id)}
                      disabled={reactivate.isPending}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Reactivar"
                    >
                      <CheckCircle size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">MARAL OS v1.0</p>
      </div>

      {/* User profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          Perfil de Usuario
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {getInitials(user?.name ?? 'U')}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-blue-600" />
          Permisos del Rol
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          {user?.role === 'GERENTE' && (
            <p className="text-green-700 bg-green-50 rounded-lg px-3 py-2">Acceso completo a todos los módulos</p>
          )}
          {user?.role === 'VENTAS' && (
            <>
              <p>✅ Clientes, Cotizaciones, Pedidos, Crédito, Catálogo, Reportes</p>
              <p className="text-gray-400">⛔ Producción, Inventario, Compras, Configuración avanzada</p>
            </>
          )}
          {user?.role === 'LOGISTICA' && (
            <>
              <p>✅ Pedidos, Producción, Inventario, Compras</p>
              <p className="text-gray-400">⛔ Clientes, Cotizaciones, Crédito, Reportes</p>
            </>
          )}
        </div>
      </div>

      {/* Users management — solo GERENTE */}
      {user?.role === 'GERENTE' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <UsersSection currentUserId={user.id} />
        </div>
      )}

      {/* App info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <SettingsIcon size={16} className="text-blue-600" />
          Información del Sistema
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plataforma</span>
            <span className="font-medium">MARAL OS v1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Empresa</span>
            <span className="font-medium">Maral Tecnología y Comunicaciones S.A.S.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Marca de producto</span>
            <span className="font-medium">MAXANT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Punto de equilibrio</span>
            <span className="font-medium text-blue-600">$40.000.000 / mes</span>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full py-3 text-red-600 border border-red-200 rounded-xl font-medium hover:bg-red-50 transition-colors"
      >
        Cerrar Sesión
      </button>
    </div>
  )
}
