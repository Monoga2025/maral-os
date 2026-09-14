import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Factory,
  Plus,
  X,
  Wrench,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  Sparkles,
  Truck,
} from 'lucide-react'
import { productionApi, productsApi, usersApi } from '../lib/api'
import { formatDate, formatCOP } from '../lib/utils'
import type { ProductionOrder, Product } from '../types'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'

const PHASES = [
  {
    key: 'BASICO',
    title: '1. Corte & Mecanizado',
    icon: <Wrench className="h-4 w-4 text-blue-600" />,
    desc: 'Corte de tubos de aluminio, dobleces y perforación',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'PREENSAMBLE',
    title: '2. Pre-ensamble & Bobinas',
    icon: <Layers className="h-4 w-4 text-amber-600" />,
    desc: 'Bobinas de antena, soldadura en plata y cables',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'ENSAMBLE_FINAL',
    title: '3. Ensamble, Calibración & Empaque',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
    desc: 'Prueba en analizador (SWR < 1.2:1) y empaque final',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
]

export default function Production() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [phaseTab, setPhaseTab] = useState<string>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newPhase, setNewPhase] = useState('BASICO')
  const [newAssignee, setNewAssignee] = useState('')
  const [newRequired, setNewRequired] = useState('')

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['production'],
    queryFn: () => productionApi.getAll({ pageSize: 150 }).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: productsResponse } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll({ pageSize: 200 }).then((r) => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.assignable().then((r) => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status, phase }: { id: string; status?: string; phase?: string }) =>
      productionApi.update(id, { status, phase } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] })
      toast.success('Estado de fabricación actualizado')
    },
    onError: () => toast.error('Error al actualizar orden de taller'),
  })

  const createOrder = useMutation({
    mutationFn: () =>
      productionApi.create({
        productId: newProductId,
        qty: newQty,
        phase: newPhase as never,
        assignedTo: newAssignee || undefined,
        requiredDate: newRequired ? new Date(newRequired + 'T12:00:00').toISOString() : undefined,
      } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production'] })
      toast.success('Nueva orden de taller enviada a fabricación')
      setShowForm(false)
      setNewProductId('')
      setNewQty(1)
    },
    onError: () => toast.error('Error al crear orden de taller'),
  })

  // Safe data array
  const rawOrders = responseData?.data ?? (Array.isArray(responseData) ? responseData : [])
  const orders: ProductionOrder[] = Array.isArray(rawOrders) ? rawOrders : []

  const rawProducts = productsResponse?.data ?? (Array.isArray(productsResponse) ? productsResponse : [])
  const products: Product[] = Array.isArray(rawProducts) ? rawProducts : []

  const assignees = (usersData ?? []).filter((u) => u.role === 'LOGISTICA' || u.role === 'GERENTE')

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product?.reference?.toLowerCase().includes(search.toLowerCase()) ||
      o.order?.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.number).includes(search)

    const matchPhase = phaseTab === 'ALL' || o.phase === phaseTab
    return matchSearch && matchPhase
  })

  const getNextPhase = (currentPhase: string) => {
    if (currentPhase === 'BASICO') return { phase: 'PREENSAMBLE', label: 'Pasar a Pre-ensamble' }
    if (currentPhase === 'PREENSAMBLE') return { phase: 'ENSAMBLE_FINAL', label: 'Pasar a Calibración & Empaque' }
    return { phase: 'ENSAMBLE_FINAL', status: 'EMPACADO', label: 'Listo para Despacho ✅' }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🏭 Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Factory className="h-3.5 w-3.5 text-amber-600" />
              Taller de Fabricación Nacional
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600">{orders.length} órdenes en taller</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Órdenes de Fabricación y Armado
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de corte de aluminio, ensamble de bobinas, cables coaxiales y calibración de frecuencia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Orden de Taller</span>
          </button>
          <TourButton tourId="produccion" />
        </div>
      </div>

      {/* 📊 Métricas Rápidas del Taller */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PHASES.map((p) => {
          const count = orders.filter((o) => o.phase === p.key && o.status !== 'EMPACADO').length
          return (
            <div
              key={p.key}
              onClick={() => setPhaseTab(phaseTab === p.key ? 'ALL' : p.key)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                phaseTab === p.key
                  ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100">{p.icon}</div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{p.title}</h3>
                    <p className="text-[11px] text-slate-500">{p.desc}</p>
                  </div>
                </div>
                <span className="text-2xl font-black text-slate-900">{count}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 🔍 Barra de Búsqueda y Filtros de Fase */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por producto, referencia o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setPhaseTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              phaseTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todas ({orders.length})
          </button>
          {PHASES.map((p) => {
            const count = orders.filter((o) => o.phase === p.key).length
            return (
              <button
                key={p.key}
                onClick={() => setPhaseTab(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  phaseTab === p.key
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p.title.split('.')[1]} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* 📋 Tarjetas de Órdenes de Fabricación (Legible, Limpio, Profesional) */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const phaseInfo = PHASES.find((p) => p.key === order.phase) || PHASES[0]
            const nextAction = getNextPhase(order.phase)

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-black text-xs">
                        #{order.number}
                      </span>
                      <div>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${phaseInfo.badgeBg}`}>
                          {phaseInfo.title}
                        </span>
                      </div>
                    </div>

                    {order.order && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Pedido #{order.order.number}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {order.product?.name ?? 'Producto de Taller'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Ref: {order.product?.reference ?? 'N/A'} • Cantidad:{' '}
                      <strong className="text-slate-900">{order.qty} {order.product?.unit || 'und'}</strong>
                    </p>

                    {order.order?.client?.name && (
                      <p className="text-xs text-blue-700 font-semibold mt-2 flex items-center gap-1">
                        <span>Cliente:</span>
                        <span>{order.order.client.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    {order.requiredDate ? (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Req: {formatDate(order.requiredDate)}
                      </span>
                    ) : (
                      <span>Despacho Normal</span>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      updateStatus.mutate({
                        id: order.id,
                        phase: nextAction.phase,
                        status: nextAction.status,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <span>{nextAction.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Factory className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">No hay órdenes en esta fase</p>
          <p className="text-xs text-slate-400 mt-1">Crea una nueva orden de taller para enviar materiales a producción.</p>
        </div>
      )}

      {/* 🛠️ Modal Nueva Orden de Taller */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Nueva Orden de Fabricación</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Producto a fabricar</label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione un producto del catálogo...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value) || 1)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fase Inicial</label>
                  <select
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BASICO">1. Corte de Tubo</option>
                    <option value="PREENSAMBLE">2. Pre-ensamble</option>
                    <option value="ENSAMBLE_FINAL">3. Calibración & Empaque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Fecha límite de entrega</label>
                <input
                  type="date"
                  value={newRequired}
                  onChange={(e) => setNewRequired(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!newProductId || createOrder.isPending}
                  onClick={() => createOrder.mutate()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-xs"
                >
                  {createOrder.isPending ? 'Creando...' : 'Crear Orden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
