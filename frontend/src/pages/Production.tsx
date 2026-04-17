import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Factory, Plus, X } from 'lucide-react'
import { productionApi, productsApi } from '../lib/api'
import { formatDate, getStatusColor } from '../lib/utils'
import type { ProductionOrder } from '../types'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'
import { Hint } from '../components/ui/Hint'

const PHASES = [
  { key: 'BASICO', label: 'Procesos Básicos', desc: 'Cortes, dobleces, perforaciones, etiquetas' },
  { key: 'PREENSAMBLE', label: 'Preensamble', desc: 'Bobinas, racores, sub-ensambles' },
  { key: 'ENSAMBLE_FINAL', label: 'Ensamble Final', desc: 'Ensamble completo, revisión, empaque' },
]

const ASSIGNEES = ['Angelo', 'Iván', 'Sin asignar']

export default function Production() {
  const qc = useQueryClient()
  const [phaseFilter, setPhaseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newPhase, setNewPhase] = useState('BASICO')
  const [newAssignee, setNewAssignee] = useState('Angelo')
  const [newRequired, setNewRequired] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['production', phaseFilter, statusFilter],
    queryFn: () => productionApi.getAll({
      phase: phaseFilter || undefined,
      status: statusFilter || undefined,
      pageSize: 100,
    }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll({ pageSize: 200 }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productionApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production'] }); toast.success('Estado actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const createOrder = useMutation({
    mutationFn: () => productionApi.create({
      productId: newProductId,
      qty: newQty,
      phase: newPhase as never,
      assignedTo: newAssignee,
      requiredDate: newRequired || undefined,
    } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] })
      toast.success('Orden de producción creada')
      setShowForm(false)
    },
    onError: () => toast.error('Error al crear orden'),
  })

  const orders: ProductionOrder[] = data?.data.data ?? []
  const products = productsData?.data.data ?? []

  const STATUS_FLOW: Record<string, string> = {
    PENDIENTE: 'EN_PROCESO',
    EN_PROCESO: 'TERMINADO',
    TERMINADO: 'EMPACADO',
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDIENTE: 'Pendiente', EN_PROCESO: 'En Proceso', TERMINADO: 'Terminado', EMPACADO: 'Empacado',
  }

  if (isLoading && !data) {
    return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producción</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} órdenes activas</p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="produccion" />
          <button
            data-tour="new-production-btn"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Flow guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Flujo de una orden de producción</p>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { step: '1', label: 'Se crea la orden', desc: 'Con producto, cantidad y quién la hace', color: 'bg-gray-100 text-gray-700' },
            { step: '→', label: '', desc: '', color: '' },
            { step: '2', label: 'Pendiente', desc: 'Esperando que Angelo o Iván la inicien', color: 'bg-yellow-100 text-yellow-700' },
            { step: '→', label: '', desc: '', color: '' },
            { step: '3', label: 'En Proceso', desc: 'El técnico está fabricando', color: 'bg-blue-100 text-blue-700' },
            { step: '→', label: '', desc: '', color: '' },
            { step: '4', label: 'Terminado', desc: 'Fabricación lista, va al área de empaque', color: 'bg-purple-100 text-purple-700' },
            { step: '→', label: '', desc: '', color: '' },
            { step: '5', label: 'Empacado ✓', desc: 'Listo para despachar el pedido', color: 'bg-green-100 text-green-700' },
          ].map((item, i) =>
            item.label === '' ? (
              <span key={i} className="text-gray-400 text-lg font-light">→</span>
            ) : (
              <div key={i} className={`flex-1 min-w-[120px] rounded-lg px-3 py-2 ${item.color}`}>
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{item.desc}</p>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-blue-600 mt-3">
          <strong>¿Qué hago yo?</strong> Busca la orden en la tabla → haz clic en el botón de la columna "Acción" para avanzarla al siguiente paso. Cuando llegue a "Empacado", el pedido puede despacharse.
        </p>
      </div>

      {/* Phase info cards */}
      <div data-tour="production-phases" className="grid grid-cols-3 gap-4">
        {PHASES.map((phase) => {
          const count = orders.filter((o) => o.phase === phase.key).length
          return (
            <div key={phase.key} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{phase.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{phase.desc}</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">{count}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las fases</option>
          {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="TERMINADO">Terminado</option>
          <option value="EMPACADO">Empacado</option>
        </select>
      </div>

      {/* Table */}
      <div data-tour="production-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['#', 'Producto', 'Pedido / Cliente', 'Cantidad', 'Fase', 'Asignado', 'Fecha Req.', 'Estado', 'Acción'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-bold text-blue-600 text-xs">#{order.number}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{order.product?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{order.product?.reference}</p>
                </td>
                <td className="px-4 py-3">
                  {order.order ? (
                    <div>
                      <p className="text-xs font-bold text-blue-600">Pedido #{order.order.number}</p>
                      <p className="text-xs text-gray-500">{(order.order as any).client?.name ?? '—'}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{order.qty}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {PHASES.find((p) => p.key === order.phase)?.label ?? order.phase}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{ASSIGNEES.includes(order.assignedTo ?? '') ? order.assignedTo : '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {order.requiredDate ? formatDate(order.requiredDate) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {STATUS_FLOW[order.status] && (
                    <button
                      onClick={() => updateStatus.mutate({ id: order.id, status: STATUS_FLOW[order.status] })}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                    >
                      → {STATUS_LABELS[STATUS_FLOW[order.status]]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Factory size={40} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">Sin órdenes de producción</p>
            <p className="text-xs mt-1">Crea una nueva orden cuando haya productos para fabricar</p>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Nueva Orden de Producción</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Producto a fabricar</label>
                <select value={newProductId} onChange={(e) => setNewProductId(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Cantidad</label>
                  <input type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Fase inicial</label>
                    <Hint text="Básico: cortes y perforaciones. Preensamble: bobinas y sub-ensambles. Ensamble Final: producto completo listo para empacar." side="top" />
                  </div>
                  <select value={newPhase} onChange={(e) => setNewPhase(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PHASES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Asignar a</label>
                    <Hint text="Angelo y Iván son los técnicos de producción. 'Sin asignar' cuando aún no se ha definido quién lo hará." side="top" />
                  </div>
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500 font-medium">Fecha requerida</label>
                    <Hint text="Fecha en que el pedido necesita este producto terminado. Ayuda a priorizar el trabajo en planta." side="top" />
                  </div>
                  <input type="date" value={newRequired} onChange={(e) => setNewRequired(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => createOrder.mutate()}
                disabled={!newProductId || createOrder.isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createOrder.isPending ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
