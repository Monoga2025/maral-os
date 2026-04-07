import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Eye, EyeOff, Info } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const demoUsers = [
  { role: 'Gerente', email: 'john@maral.com', password: 'maral2024' },
  { role: 'Ventas', email: 'lady@maral.com', password: 'maral2024' },
  { role: 'Logística', email: 'angelo@maral.com', password: 'maral2024' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Credenciales incorrectas. Intenta de nuevo.')
    }
  }

  const fillDemo = (user: (typeof demoUsers)[0]) => {
    setEmail(user.email)
    setPassword(user.password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1e293b] to-[#0f2044] p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
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

        {/* Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-300">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@maral.com"
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/10 px-3 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
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
              className="w-full h-10"
            >
              Ingresar al sistema
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Credenciales de demo
              </span>
            </div>
            <div className="space-y-2">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillDemo(u)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5 transition-colors group"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      {u.role}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{u.email}</span>
                  </div>
                  <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Usar →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          © 2024 MARAL Antenas S.A.S · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
