import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, ArrowLeft, Lock } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'
import { authApi } from '../lib/api'

type PublicUser = { id: string; name: string; role: string; title: string | null }

const roleColors: Record<string, string> = {
  GERENTE: 'from-amber-500 to-orange-500',
  VENTAS: 'from-blue-500 to-cyan-500',
  LOGISTICA: 'from-emerald-500 to-teal-500',
  CONTADORA: 'from-purple-500 to-fuchsia-500',
}

const roleLabel: Record<string, string> = {
  GERENTE: 'Gerente',
  VENTAS: 'Ventas',
  LOGISTICA: 'Logística',
  CONTADORA: 'Contadora',
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Login() {
  const navigate = useNavigate()
  const { loginCedula, isLoading } = useAuthStore()
  const [users, setUsers] = useState<PublicUser[]>([])
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [cedula, setCedula] = useState('')
  const [error, setError] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    authApi
      .listUsers()
      .then((r) => setUsers(r.data))
      .catch(() => setError('No se pudo cargar la lista de usuarios'))
      .finally(() => setLoadingUsers(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError('')
    try {
      await loginCedula(selected.id, cedula.trim())
      navigate('/')
    } catch {
      setError('Cédula incorrecta. Intenta de nuevo.')
      setCedula('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1e293b] to-[#0f2044] p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-4">
            <Radio className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            MARAL <span className="text-blue-400">OS</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 text-center">
            Plataforma de Gestión Empresarial
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl p-8">
          {!selected ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">
                ¿Quién va a ingresar?
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Selecciona tu usuario para continuar
              </p>

              {loadingUsers && (
                <p className="text-sm text-slate-400 text-center py-8">
                  Cargando usuarios...
                </p>
              )}

              {!loadingUsers && users.length === 0 && (
                <p className="text-sm text-amber-400 text-center py-8">
                  No hay usuarios configurados con cédula. Configúralos en Ajustes.
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelected(u)
                      setCedula('')
                      setError('')
                    }}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:border-blue-500/50 hover:bg-white/10 transition-all"
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${
                        roleColors[u.role] ?? 'from-slate-500 to-slate-600'
                      } text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform`}
                    >
                      {initials(u.name)}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white truncate max-w-[140px]">
                        {u.name}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mt-0.5">
                        {roleLabel[u.role] ?? u.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelected(null)
                  setCedula('')
                  setError('')
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cambiar usuario
              </button>

              <div className="flex flex-col items-center mb-6">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${
                    roleColors[selected.role] ?? 'from-slate-500 to-slate-600'
                  } text-white text-2xl font-bold shadow-lg`}
                >
                  {initials(selected.name)}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">
                  {selected.name}
                </h2>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {roleLabel[selected.role] ?? selected.role}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-300">
                    Número de cédula
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      autoFocus
                      value={cedula}
                      onChange={(e) =>
                        setCedula(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="Ingresa tu cédula"
                      required
                      className="h-11 w-full rounded-lg border border-white/10 bg-white/10 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 tracking-widest"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={cedula.length < 4}
                  className="w-full h-11"
                >
                  Ingresar al sistema
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          © 2024 MARAL Antenas S.A.S · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
