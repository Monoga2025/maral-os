import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Plus, X, AlertTriangle, Check } from 'lucide-react'
import { purchasesApi, productsApi } from '../lib/api'
import { formatCOP, formatDate, getStatusColor } from '../lib/utils'
import type { Product, Supplier } from '../types'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'
import { Hint } from '../components/ui/Hint'

export default function Purchases() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [items, setItems] = useState<{ productId: string; product?: Product; qty: number; unitCost: number }[]>([])
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesApi.getAll({ pageSize: 50 }),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => purchasesApi.getSuppliers(),
  })

  const { data: criticalData } = useQuery({
    queryKey: ['critical-stock'],
    queryFn: () => productsApi.getCritical(),
  })

  const createOrder = useMutation({
    mutationFn: () => purchasesApi.create({
      supplierId: selectedSupplier,
      notes,
      total: items.reduce((a, i) => a + i.qty * i.unitCost, 0),
      items: items.map((i) => ({ productId: i.productId, qty: i.qty, unitCost: i.unitCost })),
    } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Orden de compra creada')
      setShowForm(false)
      setItems([]); setSelectedSupplier(''); setNotes('')
    },
    onError: () => toast.error('Error al crear orden'),
  })

  const receiveOrder = useMutation({
    mutationFn: (id: string) => purchasesApi.receive(id, []),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); toast.success('Recepción registrada, inventario actualizado') },
    onError: () => toast.error('Error al recibir'),
  })

  const orders = data?.data.data ?? []
  const suppliers: Supplier[] = suppliersData?.data ?? []
  const criticalProducts: Product[] = criticalData?.data ?? []

  const addCritical = () => {
    const toAdd = criticalProducts.filter((p) => !items.find((i) => i.productId === p.id))
    setItems((prev) => [...prev, ...toAdd.map((p) => ({ productId: p.id, product: p, qty: p.minStock - p.stock, unitCost: p.cost }))])
    toast.success(`${toAdd.length} productos críticos agregados`)
  }

  if (isLoading && !data) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} órdenes registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="compras" />
          <button
            data-tour="new-purchase-btn"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nueva Orden de Compra
          </button>
        </div>
      </div>

      {/* Critical stock alert */}
      {criticalProducts.length > 0 && (
        <div data-tour="critical-alert" className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">
              {criticalProducts.length} productos con stock crítico que requieren reposición urgente
            </p>
            <p className="text-xs text-red-600 mt-0.5">Haz clic en "Crear orden urgente" para agregarlos automáticamente</p>
          </div>
          <button onClick={() => { setShowForm(true); setTimeout(addCritical, 100) }}
            className="text-xs text-red-700 border border-red-300 rounded px-3 py-1.5 hover:bg-red-100 transition-colors font-medium whitespace-nowrap">
            Crear orden urgente
          </button>
        </div>
      )}

      {/* Table */}
      <div data-tour="purchases-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['#', 'Proveedor', 'Fecha', 'Items', 'Total', 'Estado', 'Recibido', 'Acción'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-bold text-gray-700 text-xs">#{order.number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{order.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3 text-gray-600">{(order as any)._count?.items ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(order.total)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {order.receivedAt ? formatDate(order.receivedAt) : '—'}
                </td>
                <td className="px-4 py-3">
                  {order.status !== 'RECIBIDA' && order.status !== 'CANCELADA' && (
                    <button
                      onClick={() => receiveOrder.mutate(order.id)}
                      className="flex items-center gap-1 text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 transition-colors"
                    >
                      <Check size={12} />
                      Recibir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">Sin órdenes de compra</p>
            <p className="text-xs mt-1">Crea una orden cuando necesites reponer inventario</p>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Nueva Orden de Compra</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs text-gray-500 font-medium">Proveedor</label>
                  <Hint text="Selecciona el proveedor al que le vas a hacer el pedido. Si no aparece en la lista, primero debes registrarlo." side="top" />
                </div>
                <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.city}</option>)}
                </select>
              </div>

              {criticalProducts.length > 0 && (
                <button onClick={addCritical}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors">
                  <AlertTriangle size={14} />
                  Agregar todos los productos críticos ({criticalProducts.length})
                </button>
              )}

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs text-gray-500 font-medium">Productos a pedir</p>
                  <Hint text="Ingresa la cantidad a pedir y el costo unitario. El sistema calcula el total automáticamente." side="top" />
                </div>
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2 mb-2 bg-gray-50 rounded-lg p-2">
                    <div className="flex-1 text-sm font-medium truncate">{item.product?.name ?? item.productId}</div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Cantidad</p>
                      <input type="number" value={item.qty} min={1}
                        onChange={(e) => setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, qty: Number(e.target.value) } : i))}
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Costo unit.</p>
                      <input type="number" value={item.unitCost} min={0}
                        onChange={(e) => setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, unitCost: Number(e.target.value) } : i))}
                        className="w-28 border border-gray-200 rounded px-2 py-1 text-sm text-right" />
                    </div>
                    <button onClick={() => setItems((prev) => prev.filter((i) => i.productId !== item.productId))}
                      className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
                    <ShoppingCart size={24} className="mx-auto mb-2 opacity-40" />
                    <p>Sin productos. Agrega los productos críticos o agrégalos manualmente.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Notas u observaciones</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Ej: Urgente para pedido #123, pedir también el empaque..."
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {items.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="font-medium text-gray-700">Total estimado</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatCOP(items.reduce((a, i) => a + i.qty * i.unitCost, 0))}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => createOrder.mutate()}
                disabled={!selectedSupplier || items.length === 0 || createOrder.isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createOrder.isPending ? 'Creando...' : 'Crear Orden de Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
