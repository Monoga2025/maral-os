import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, AlertTriangle, Clock, TrendingUp, Check, X, Bell } from 'lucide-react'
import { invoicesApi } from '../lib/api'
import { formatCOP, formatDate, getDaysAgo } from '../lib/utils'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'
import { Hint } from '../components/ui/Hint'

const FACTORING_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-700',
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  INACTIVO: 'bg-gray-100 text-gray-600',
  APROBADO: 'bg-green-100 text-green-700',
  EN_ESTUDIO: 'bg-yellow-100 text-yellow-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  NO_APLICA: 'bg-gray-100 text-gray-600',
}

export default function Credit() {
  const qc = useQueryClient()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['credit-summary'],
    queryFn: () => invoicesApi.getCreditSummary(),
  })

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.getAll({ pageSize: 100 }),
  })

  const registerPayment = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => invoicesApi.registerPayment(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['credit-summary'] })
      toast.success('Pago registrado')
      setPayingId(null)
      setPayAmount('')
    },
    onError: () => toast.error('Error al registrar pago'),
  })

  const summary = summaryData?.data
  const invoices = invoicesData?.data.data ?? []

  const nearDue = invoices.filter((inv) => {
    if (inv.status !== 'VIGENTE') return false
    const days = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  })

  useEffect(() => {
    if (nearDue.length > 0 && !invoicesLoading) {
      toast.warning(
        `⚠️ ${nearDue.length} factura${nearDue.length !== 1 ? 's' : ''} vence${nearDue.length !== 1 ? 'n' : ''} en los próximos 3 días`,
        { duration: 6000, id: 'near-due-alert' }
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicesLoading])

  if ((summaryLoading && !summaryData) || (invoicesLoading && !invoicesData)) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crédito y Cartera</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de factoring FINANCIA y cuentas por cobrar</p>
        </div>
        <TourButton tourId="credito" />
      </div>

      {/* KPI Cards */}
      <div data-tour="credit-kpis" className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Cartera Vigente</p>
              <p className="text-2xl font-bold text-gray-900">{formatCOP(summary?.totalVigente ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Dentro del plazo</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Cartera Vencida</p>
              <p className="text-2xl font-bold text-red-600">{formatCOP(summary?.totalVencida ?? 0)}</p>
              <p className="text-xs text-red-400 mt-0.5">Requiere gestión urgente</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Próximos 7 días</p>
              <p className="text-2xl font-bold text-orange-600">{formatCOP(summary?.proximaVencer ?? 0)}</p>
              <p className="text-xs text-orange-400 mt-0.5">Por vencer pronto</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-day alert banner */}
      {nearDue.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Bell className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {nearDue.length === 1 ? '1 factura vence en los próximos 3 días' : `${nearDue.length} facturas vencen en los próximos 3 días`}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {nearDue.map((inv) => {
                const days = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)
                return (
                  <span key={inv.id} className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                    {inv.client?.name ?? `#${inv.number}`} — vence {days === 0 ? 'hoy' : `en ${days}d`}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Credit rules */}
      <div data-tour="credit-rules" className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          Reglas de Crédito (FINANCIA)
          <Hint text="FINANCIA es la entidad de factoring de Maral. Estos son los criterios que usa para subir o bajar el cupo de crédito de cada cliente." side="right" />
        </h2>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">3</div>
            <div className="text-sm"><span className="font-medium">pagos puntuales</span> → <span className="text-green-600 font-semibold">Sube cupo</span></div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold">1</div>
            <div className="text-sm"><span className="font-medium">retraso</span> → <span className="text-orange-600 font-semibold">Baja cupo</span></div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-xs font-bold">2</div>
            <div className="text-sm"><span className="font-medium">retrasos</span> → <span className="text-red-600 font-semibold">Solo contado</span></div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="text-sm text-gray-500">Crédito: precio base <span className="font-semibold">+3% a +6%</span></div>
        </div>
      </div>

      {/* Per-client credit */}
      {(summary?.byClient ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Cupos por Cliente</h2>
            <Hint text="Muestra cuánto crédito tiene asignado cada cliente, cuánto ha usado y cuánto le queda disponible para comprar a crédito." side="right" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Cliente', 'Cupo Total', 'Usado', 'Disponible', 'Días Mora', 'Factoring', 'Uso %'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary!.byClient.map(({ client, cupo, usado, disponible, diasMora, factoringStatus }) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCOP(cupo)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(usado)}</td>
                  <td className={`px-4 py-3 font-semibold ${disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCOP(disponible)}</td>
                  <td className={`px-4 py-3 font-medium ${diasMora > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {diasMora > 0 ? `${diasMora}d` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FACTORING_BADGE[factoringStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {factoringStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${(cupo > 0 ? (usado / cupo) * 100 : 0) > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, cupo > 0 ? (usado / cupo) * 100 : 0)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{cupo > 0 ? Math.round((usado / cupo) * 100) : 0}% usado</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice tracker */}
      <div data-tour="credit-invoices" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Facturas por Cobrar</h2>
          <Hint text="Lista de todas las facturas pendientes. Las filas en rojo están vencidas. Cuando un cliente paga, haz clic en 'Registrar pago' para actualizar el cupo." side="right" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Cliente', 'Emisión', 'Vencimiento', 'Monto', 'Estado', 'Días vencida', 'Acción'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const isOverdue = inv.status === 'VENCIDA'
              const daysOverdue = isOverdue ? getDaysAgo(inv.dueDate) : 0
              const daysUntilDue = inv.status === 'VIGENTE'
                ? Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86400000)
                : null
              const isNearDue = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3
              return (
                <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50' : isNearDue ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-blue-600 text-xs">#{inv.number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.client?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(inv.createdAt)}</td>
                  <td className={`px-4 py-3 text-xs font-medium ${isOverdue ? 'text-red-600' : isNearDue ? 'text-amber-600' : 'text-gray-600'}`}>
                    {formatDate(inv.dueDate)}
                    {isNearDue && (
                      <span className="ml-1.5 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        Vence pronto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inv.status === 'PAGADA' ? 'bg-green-100 text-green-700' :
                      inv.status === 'VENCIDA' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-bold ${daysOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {daysOverdue > 0 ? `${daysOverdue}d` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {inv.status !== 'PAGADA' && (
                      payingId === inv.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Monto"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-24 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-400"
                            autoFocus
                          />
                          <button
                            onClick={() => registerPayment.mutate({ id: inv.id, amount: parseFloat(payAmount) || 0 })}
                            disabled={!payAmount || parseFloat(payAmount) <= 0}
                            className="text-green-600 hover:text-green-800 disabled:opacity-40"
                          ><Check size={16} /></button>
                          <button onClick={() => { setPayingId(null); setPayAmount('') }}
                            className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setPayingId(inv.id)}
                          className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors">
                          Registrar pago
                        </button>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="py-16 text-center text-gray-400 max-w-sm mx-auto">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-600">No hay facturas por cobrar</p>
            <p className="text-sm mt-1 text-gray-400 leading-relaxed">
              Los pedidos despachados a crédito aparecerán aquí. Para crear una factura de crédito, activa la opción al registrar un despacho en el detalle del pedido.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
