import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../lib/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Search, Plus, Trash2, Package } from 'lucide-react'
import type { ProductLine, ProductCategory, ProductComponent } from '../types'

const CATEGORIES = [
  { value: 'ESTACION_BASE', label: 'Estación Base' },
  { value: 'MOVIL', label: 'Móvil' },
  { value: 'HANDY', label: 'Handy' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'CONECTOR', label: 'Conector' },
  { value: 'BASE', label: 'Base' },
  { value: 'ACCESORIO', label: 'Accesorio' },
  { value: 'MATERIA_PRIMA', label: 'Materia Prima' },
]

const LINES = [
  { value: 'ESTANDAR', label: 'Estándar' },
  { value: 'PREMIUM', label: 'Premium' },
]

interface FormData {
  reference: string
  name: string
  category: ProductCategory
  line: ProductLine
  priceList: string
  priceDistributor: string
  cost: string
  stock: string
  minStock: string
  unit: string
  isKit: boolean
}

const emptyForm: FormData = {
  reference: '',
  name: '',
  category: 'ESTACION_BASE',
  line: 'ESTANDAR',
  priceList: '',
  priceDistributor: '',
  cost: '',
  stock: '0',
  minStock: '0',
  unit: 'und',
  isKit: false,
}

interface KitComponentRow {
  componentId: string
  name: string
  reference: string
  unit: string
  qty: number
  compUnit: string
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)

  // Kit BOM state
  const [kitRows, setKitRows] = useState<KitComponentRow[]>([])
  const [componentSearch, setComponentSearch] = useState('')

  // Search components to add to BOM
  const { data: componentResults } = useQuery({
    queryKey: ['products-component-search', componentSearch],
    queryFn: () =>
      productsApi.getAll({ search: componentSearch, pageSize: 10 }).then((r) => r.data),
    enabled: componentSearch.length > 1,
  })

  // Load existing kit components when editing
  useEffect(() => {
    if (!isEdit || !id) return
    setLoadingData(true)
    Promise.all([
      productsApi.getById(id),
      productsApi.getComponents(id).catch(() => ({ data: [] as ProductComponent[] })),
    ])
      .then(([productRes, compRes]) => {
        const p = productRes.data
        setForm({
          reference: p.reference ?? '',
          name: p.name ?? '',
          category: p.category ?? 'ESTACION_BASE',
          line: p.line ?? 'ESTANDAR',
          priceList: String(p.priceList ?? ''),
          priceDistributor: String(p.priceDistributor ?? ''),
          cost: String(p.cost ?? ''),
          stock: String(p.stock ?? '0'),
          minStock: String(p.minStock ?? '0'),
          unit: p.unit ?? 'und',
          isKit: p.isKit ?? false,
        })
        const comps = compRes.data as ProductComponent[]
        setKitRows(
          comps.map((c) => ({
            componentId: c.componentId,
            name: c.component?.name ?? '',
            reference: c.component?.reference ?? '',
            unit: c.component?.unit ?? 'und',
            qty: c.qty,
            compUnit: c.unit,
          }))
        )
      })
      .catch(() => setError('No se pudo cargar el producto'))
      .finally(() => setLoadingData(false))
  }, [id, isEdit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const addComponent = (product: { id: string; name: string; reference: string; unit: string }) => {
    if (product.id === id) return // can't add itself
    if (kitRows.find((r) => r.componentId === product.id)) return // already added
    setKitRows((prev) => [
      ...prev,
      {
        componentId: product.id,
        name: product.name,
        reference: product.reference,
        unit: product.unit,
        qty: 1,
        compUnit: product.unit,
      },
    ])
    setComponentSearch('')
  }

  const updateComponentQty = (componentId: string, qty: number) => {
    setKitRows((prev) =>
      prev.map((r) => (r.componentId === componentId ? { ...r, qty } : r))
    )
  }

  const removeComponent = (componentId: string) => {
    setKitRows((prev) => prev.filter((r) => r.componentId !== componentId))
  }

  // Save components mutation (only for edit mode)
  const saveComponentsMutation = useMutation({
    mutationFn: (productId: string) =>
      productsApi.setComponents(productId, {
        components: kitRows.map((r) => ({ componentId: r.componentId, qty: r.qty, unit: r.compUnit })),
      }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      reference: form.reference,
      name: form.name,
      category: form.category,
      line: form.line,
      priceList: Number(form.priceList),
      priceDistributor: Number(form.priceDistributor),
      cost: Number(form.cost),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      unit: form.unit,
      isKit: form.isKit,
    }

    try {
      let savedId = id
      if (isEdit && id) {
        await productsApi.update(id, payload)
      } else {
        const res = await productsApi.create(payload)
        savedId = res.data.id
      }

      // Save kit components if this is a kit
      if (form.isKit && savedId) {
        await saveComponentsMutation.mutateAsync(savedId)
      }

      queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/catalogo')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(
        axiosErr.response?.data?.error ?? 'Error al guardar el producto'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEdit
            ? 'Modifica los datos del producto'
            : 'Completa los datos para agregar un producto al catálogo'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Referencia <span className="text-red-500">*</span>
            </label>
            <Input
              name="reference"
              value={form.reference}
              onChange={handleChange}
              placeholder="Ej: MB-001"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Unidad</label>
            <Input
              name="unit"
              value={form.unit}
              onChange={handleChange}
              placeholder="und"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <Input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nombre del producto"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Línea</label>
            <select
              name="line"
              value={form.line}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LINES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Precio Lista <span className="text-red-500">*</span>
            </label>
            <Input
              name="priceList"
              type="number"
              min="0"
              step="any"
              value={form.priceList}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Precio Distribuidor <span className="text-red-500">*</span>
            </label>
            <Input
              name="priceDistributor"
              type="number"
              min="0"
              step="any"
              value={form.priceDistributor}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Costo <span className="text-red-500">*</span>
            </label>
            <Input
              name="cost"
              type="number"
              min="0"
              step="any"
              value={form.cost}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Stock</label>
            <Input
              name="stock"
              type="number"
              min="0"
              step="any"
              value={form.stock}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Stock Mínimo</label>
            <Input
              name="minStock"
              type="number"
              min="0"
              step="any"
              value={form.minStock}
              onChange={handleChange}
              placeholder="0"
            />
          </div>
        </div>

        {/* Kit toggle */}
        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
          <input
            type="checkbox"
            name="isKit"
            checked={form.isKit}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Es un kit / producto compuesto</p>
              <p className="text-xs text-gray-500">
                Permite definir una receta de componentes que se descuentan del inventario al vender
              </p>
            </div>
          </div>
        </label>

        {/* Kit BOM editor */}
        {form.isKit && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-900">Receta del kit (componentes)</p>
            <p className="text-xs text-gray-500">
              Al cotizar este kit, el asesor comercial podrá ver y ajustar estas cantidades sin cambiar la referencia.
            </p>

            {/* Component search */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar componente para agregar..."
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="flex-1 text-sm outline-none"
                />
              </div>
              {componentResults?.data?.length && componentSearch.length > 1 ? (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {componentResults.data
                    .filter((p) => p.id !== id)
                    .map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        onClick={() => addComponent(product)}
                      >
                        <Plus className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="font-mono text-xs text-gray-500 w-20 shrink-0">
                          {product.reference}
                        </span>
                        <span className="text-sm text-gray-900 flex-1 truncate">{product.name}</span>
                        <span className="text-xs text-gray-400">{product.unit}</span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>

            {/* Components table */}
            {kitRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Sin componentes. Busca y agrega los materiales que componen este kit.
              </p>
            ) : (
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Componente</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-28">Cantidad</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-16">Unid.</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {kitRows.map((row) => (
                      <tr key={row.componentId} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{row.reference}</td>
                        <td className="px-3 py-2 text-gray-900">{row.name}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            value={row.qty}
                            onChange={(e) =>
                              updateComponentQty(row.componentId, Number(e.target.value))
                            }
                            className="w-full text-center rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{row.unit}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeComponent(row.componentId)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/catalogo')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? 'Guardando...'
                : 'Creando...'
              : isEdit
              ? 'Guardar cambios'
              : 'Crear producto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
