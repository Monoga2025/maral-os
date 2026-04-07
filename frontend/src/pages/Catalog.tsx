import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Grid3X3, Plus, TrendingUp, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { productsApi } from '../lib/api'
import { formatCOP } from '../lib/utils'
import type { Product } from '../types'
import { TourButton } from '../components/tour/TourButton'
import { Hint } from '../components/ui/Hint'

const LINES = [
  { key: '', label: 'Todos' },
  { key: 'ESTACION_BASE', label: 'Estación Base' },
  { key: 'MOVIL', label: 'Móvil' },
  { key: 'HANDY', label: 'Handy' },
  { key: 'CABLE', label: 'Cables' },
  { key: 'CONECTOR', label: 'Conectores' },
  { key: 'BASE', label: 'Bases' },
  { key: 'ACCESORIO', label: 'Accesorios' },
]

const LINE_COLOR: Record<string, string> = {
  ESTACION_BASE: 'bg-blue-500',
  MOVIL: 'bg-orange-500',
  HANDY: 'bg-purple-500',
  CABLE: 'bg-gray-400',
  CONECTOR: 'bg-teal-500',
  BASE: 'bg-yellow-500',
  ACCESORIO: 'bg-green-500',
}

export default function Catalog() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => productsApi.getAll({ category: category || undefined, search: search || undefined, pageSize: 200 }),
  })

  const products: Product[] = data?.data.data ?? []

  const margin = (p: Product) => {
    const price = p.priceList ?? p.price ?? 0
    return price > 0 && p.cost > 0 ? Math.round(((price - p.cost) / price) * 100) : 0
  }

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} productos</p>
        </div>
        <div className="flex items-center gap-2">
          <TourButton tourId="catalogo" />
          <button
            data-tour="new-product-btn"
            onClick={() => navigate('/catalogo/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div data-tour="catalog-filters" className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {LINES.map((l) => (
            <button
              key={l.key}
              onClick={() => setCategory(l.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === l.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto text-xs text-gray-400">
          <Hint text="Verde = margen ≥50% (excelente). Azul = ≥30% (bueno). Naranja = <30% (revisar precio o costo)." side="left" />
          <span>Código de colores: margen</span>
        </div>
      </div>

      {/* Product grid */}
      <div data-tour="catalog-grid" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => {
          const mg = margin(p)
          const isCritical = p.stock < p.minStock
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/catalogo/${p.id}/editar`)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group relative"
            >
              {/* Line color bar */}
              <div className={`h-1.5 ${LINE_COLOR[p.line ?? ''] ?? 'bg-blue-500'}`} />

              {/* Edit overlay on hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white rounded-lg shadow border border-gray-200 p-1.5">
                  <Pencil size={12} className="text-gray-500" />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {p.reference}
                  </span>
                  {isCritical && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Crítico</span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{p.name}</h3>

                <div className="flex items-center gap-1 mb-3">
                  <span className="text-xs text-gray-500">{p.unit}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">Stock: <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-gray-700'}`}>{p.stock}</span></span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Precio lista</span>
                    <span className="font-bold text-gray-900 text-sm">{formatCOP(p.priceList ?? p.price ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Costo</span>
                    <span className="text-xs text-gray-600">{formatCOP(p.cost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <TrendingUp size={10} />Margen
                    </span>
                    <span className={`text-xs font-bold ${mg >= 50 ? 'text-green-600' : mg >= 30 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {mg}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {products.length === 0 && (
        <div className="py-20 text-center text-gray-400">
          <Grid3X3 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No se encontraron productos</p>
          <p className="text-sm mt-1">Intenta con otro filtro o agrega un producto nuevo</p>
        </div>
      )}
    </div>
  )
}
