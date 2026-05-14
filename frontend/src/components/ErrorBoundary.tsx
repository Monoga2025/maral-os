import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Algo salió mal en este módulo</h2>
            <p className="text-sm text-gray-500 mt-1">Navega a otro módulo o recarga si el problema persiste</p>
            <p className="text-xs text-red-400 mt-2 font-mono">{this.state.error?.message}</p>
          </div>
          <button
            onClick={() => { window.location.href = '/' }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Ir al inicio
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
