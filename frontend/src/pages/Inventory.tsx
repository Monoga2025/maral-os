import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, TrendingDown, Package, DollarSign, Plus, X } from 'lucide-react'
import { inventoryApi, productsApi } from '../lib/api'
import { formatCOP } from '../lib/utils'
import type { Product } from '../types'
import { toast } from 'sonner'
import { TourButton } from '../components/tour/TourButton'

type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION'

const CATEGORIES = ['Todos', 'ESTACION_BASE', 'MOVIL', 'HANDY', 'CABLE', 'CONECTOR', 'BASE', 'ACCESORIO', 'MATERIA_PRIMA']
const CAT_LABELS: Record<string, string> = {
  ESTACION_BASE: 'Estación Base', MOVIL: 'Móvil', HANDY: 'Handy',
  CABLE: 'Cable', CONECTOR: 'Conector', BASE: 'Base',
  ACCESORIO: 'Accesorio', MATERIA_PRIMA: 'Materia Prima',
}

export default function Inventory() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [stockStatus, setStockStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mvType, setMvType] = useState<MovementType>('ENTRADA')
  const [mvProductId, setMvProductId] = useState('')
  const [mvQty, setMvQty] = useState(0)
  const [mvReason, setMvReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, category, stockStatus],
    queryFn: () => inventoryApi.getAll({
      search: search || undefined,
      category: category !== 'Todos' ? category : undefined,
      stockStatus: stockStatus || undefined,
      pageSize: 200,
    }),
  })

  const { data: allProducts } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll({ pageSize: 200 }),
  })

  const registerMovement = useMutation({
    mutationFn: () => inventoryApi.registerMovement({
      productId: mvProductId,
      type: mvType,
      qty: mvQty,
      reason: mvReason,
    } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Movimiento registrado')
      setShowModal(false)
      setMvProductId(''); setMvQty(0); setMvReason('')
    },
    onError: () => toast.error('Error al registrar movimiento'),
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productsApi.update(id, data as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Producto actualizado') },
    onError: () => toast.error('Error al actualizar producto'),
  })

  const products: Product[] = data?.data.data ?? []
  const allProds: Product[] = allProducts?.data.data ?? []

  const critical = products.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length
  const sinStock = products.filter((p) => p.minStock > 0 && p.stock === 0).length
  const totalValue = products.reduce((a, p) => a + p.stock * p.cost, 0)

  const rowColor = (p: Product) => {
    if (p.minStock > 0 && p.stock < p.minStock) return 'bg-red-50 border-l-4 border-red-400'
    if (p.minStock > 0 && p.stock <= p.minStock * 1.2) return 'bg-orange-50 border-l-4 border-orange-400'
    return ''
  }

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} referencias</p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="inventario" />
          <button
            data-tour="register-movement-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Registrar Movimiento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total SKUs</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setStockStatus(stockStatus === 'CRITICO' ? '' : 'CRITICO')} className={`text-left bg-white rounded-xl border p-5 transition-colors ${stockStatus === 'CRITICO' ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 hover:bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Stock Crítico</p>
              <p className="text-2xl font-bold text-red-600">{critical}</p>
            </div>
          </div>
        </button>
        <button type="button" onClick={() => setStockStatus(stockStatus === 'SIN_STOCK' ? '' : 'SIN_STOCK')} className={`text-left bg-white rounded-xl border p-5 transition-colors ${stockStatus === 'SIN_STOCK' ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200 hover:bg-orange-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sin stock</p>
              <p className="text-2xl font-bold text-orange-600">{sinStock}</p>
            </div>
          </div>
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Valor Inventario</p>
              <p className="text-lg font-bold text-gray-900">{formatCOP(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar referencia o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CAT_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded" />Por debajo del mínimo</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-400 rounded" />En nivel mínimo</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 rounded" />Stock OK</div>
      </div>

      {/* Table */}
      <div data-tour="inventory-list" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Referencia', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Costo unit.', 'Valor total', 'Estado'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => {
              const isCritical = p.minStock > 0 && p.stock < p.minStock
              const isAtMin = p.minStock > 0 && p.stock <= p.minStock * 1.2
              return (
                <tr key={p.id} className={`${rowColor(p)} transition-colors`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.reference}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{CAT_LABELS[p.category ?? ''] ?? p.category}</td>
                  <td className={`px-4 py-3 font-bold ${isCritical ? 'text-red-600' : isAtMin ? 'text-orange-600' : 'text-gray-900'}`}>
                    <input
                      type="number"
                      value={p.stock}
                      onChange={(e) => updateProduct.mutate({ id: p.id, data: { stock: Number(e.target.value) } })}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm font-bold"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <input
                      type="number"
                      value={p.minStock}
                      onChange={(e) => updateProduct.mutate({ id: p.id, data: { minStock: Number(e.target.value) } })}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCOP(p.cost)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(p.stock * p.cost)}</td>
                  <td className="px-4 py-3">
                    {isCritical ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Crítico</span>
                    ) : isAtMin ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">En mínimo</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Movimiento</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Tipo de movimiento</label>
                <select value={mvType} onChange={(e) => setMvType(e.target.value as MovementType)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ENTRADA">Entrada (compra/recepción)</option>
                  <option value="SALIDA">Salida (producción/venta)</option>
                  <option value="AJUSTE">Ajuste de inventario</option>
                  <option value="DEVOLUCION">Devolución</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Producto</label>
                <select value={mvProductId} onChange={(e) => setMvProductId(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar producto...</option>
                  {allProds.map((p) => (
                    <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Cantidad</label>
                <input type="number" min={1} value={mvQty} onChange={(e) => setMvQty(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Razón / Referencia</label>
                <input type="text" value={mvReason} onChange={(e) => setMvReason(e.target.value)}
                  placeholder="ej: Pedido #123, Compra a proveedor..."
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => registerMovement.mutate()}
                disabled={!mvProductId || !mvQty || registerMovement.isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {registerMovement.isPending ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
