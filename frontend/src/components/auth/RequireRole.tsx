import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { ShieldAlert } from 'lucide-react'

interface RequireRoleProps {
  roles: string[]
  children: React.ReactNode
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Módulo Restringido</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1.5 mb-6">
          Tu rol actual (<strong>{user.role}</strong>) no tiene permisos asignados para acceder a este módulo.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
        >
          Volver a mi Panel Principal
        </a>
      </div>
    )
  }

  return <>{children}</>
}
