import { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleHardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.unregister()
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[450px] gap-5 text-center p-8 bg-slate-50/50 rounded-3xl border border-slate-200/80 m-4">
          <div className="w-16 h-16 bg-red-100/80 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-slate-900">Algo no cargó correctamente en este módulo</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              El sistema aisló el inconveniente para proteger tu sesión. Puedes reintentar cargar la vista o actualizar la versión.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-red-500 mt-3 p-2.5 bg-red-50 rounded-xl font-mono text-left break-all border border-red-100">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reintentar módulo
            </button>
            <button
              onClick={this.handleHardRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Actualizar versión y limpiar caché
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Ir al Inicio
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

