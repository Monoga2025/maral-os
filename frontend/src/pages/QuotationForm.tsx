import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Trash2,
  Plus,
  Minus,
  Check,
  FileText,
  Package,
  Pencil,
  X,
  Upload,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi, productsApi, quotationsApi } from '../lib/api'
import { formatCOP, formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { ClientCategoryBadge } from '../components/ui/StatusBadge'
import { Hint } from '../components/ui/Hint'
import type { Client, Product, ProductComponent } from '../types'

interface KitComponentOverride {
  componentId: string
  name: string
  reference: string
  unit: string
  qty: number
}

interface LineItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  kitComponents?: KitComponentOverride[]
}

type FormValues = {
  validityDays: number
  paymentTerms: string
  followUpDate: string
  notes: string
  shippingAddress: string
}

const TAX_RATE = 0.19

const CATEGORY_DISCOUNTS: Partial<Record<string, { code: string; pct: number; label: string }>> = {
  IMPORTADOR:    { code: 'IM', pct: 36, label: 'Importador' },
  DISTRIBUIDOR:  { code: 'DS', pct: 26, label: 'Distribuidor' },
  CLIENTE_FINAL: { code: 'CF', pct: 10, label: 'Cliente Final' },
}

// ── Kit Component Editor Modal ────────────────────────────────

interface KitEditorProps {
  product: Product
  defaultComponents: ProductComponent[]
  onConfirm: (components: KitComponentOverride[]) => void
  onClose: () => void
}

function KitEditor({ product, defaultComponents, onConfirm, onClose }: KitEditorProps) {
  const [rows, setRows] = useState<KitComponentOverride[]>(
    defaultComponents.map((c) => ({
      componentId: c.componentId,
      name: c.component?.name ?? '',
      reference: c.component?.reference ?? '',
      unit: c.component?.unit ?? 'und',
      qty: c.qty,
    }))
  )

  const updateQty = (componentId: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) => (r.componentId === componentId ? { ...r, qty } : r))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{product.name}</p>
              <p className="text-xs text-gray-500">
                Ajusta las cantidades de los componentes para este pedido
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Este kit no tiene componentes definidos en el catálogo.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Componente</th>
                  <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase w-28">Cantidad</th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase w-14">Unid.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.componentId} className="border-b border-gray-50">
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs font-mono text-gray-400">{row.reference}</p>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={row.qty}
                        onChange={(e) => updateQty(row.componentId, Number(e.target.value))}
                        className="w-full text-center rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 text-xs text-gray-500">{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mx-5 mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          El cliente verá solo el nombre del kit y el precio total. Los componentes son para control interno de inventario.
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 p-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(rows)} leftIcon={<Check className="h-4 w-4" />}>
            Confirmar componentes
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main QuotationForm ────────────────────────────────────────

export default function QuotationForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const [step, setStep] = useState(1)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [applyTax, setApplyTax] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [finalPriceInputs, setFinalPriceInputs] = useState<Record<string, string>>({})

  const [kitEditorProduct, setKitEditorProduct] = useState<Product | null>(null)
  const [kitEditorComponents, setKitEditorComponents] = useState<ProductComponent[]>([])
  const [parsingImage, setParsingImage] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<string | null>(null)

  const { register, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      validityDays: 15,
      paymentTerms: 'Contado',
      followUpDate: '',
      notes: '',
      shippingAddress: '',
    },
  })

  // ── Load existing quotation in edit mode ──────────────────────
  const { data: existingQuotation, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationsApi.getById(id!).then((r) => r.data),
    enabled: isEditMode,
  })

  useEffect(() => {
    if (!existingQuotation || initialized) return

    setSelectedClient(existingQuotation.client ?? null)
    setApplyTax(existingQuotation.tax > 0)
    const mapped: LineItem[] = []
    for (const item of existingQuotation.items ?? []) {
      if (!item.product) continue
      mapped.push({
        productId: item.productId,
        product: item.product as Product,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        subtotal: item.subtotal,
        kitComponents: item.kitComponents?.map((kc) => ({
          componentId: kc.componentId,
          name: kc.component?.name ?? '',
          reference: kc.component?.reference ?? '',
          unit: kc.component?.unit ?? 'und',
          qty: kc.qty,
        })),
      })
    }
    setItems(mapped)
    reset({
      validityDays: existingQuotation.validityDays,
      paymentTerms: existingQuotation.paymentTerms ?? 'Contado',
      followUpDate: existingQuotation.followUpDate
        ? new Date(existingQuotation.followUpDate).toISOString().split('T')[0]
        : '',
      notes: existingQuotation.notes ?? '',
      shippingAddress: existingQuotation.shippingAddress ?? '',
    })
    setInitialized(true)
    setStep(2) // jump to products so the user can review immediately
  }, [existingQuotation, initialized, reset])

  // ── Client search ─────────────────────────────────────────────
  const { data: clientResults } = useQuery({
    queryKey: ['clients-search', clientSearch],
    queryFn: () =>
      clientsApi.getAll({ search: clientSearch || undefined, pageSize: 8 }).then((r) => r.data),
    enabled: clientSearch.length > 0,
  })

  const { data: productResults } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () =>
      productsApi.getAll({ search: productSearch, pageSize: 10 }).then((r) => r.data),
    enabled: productSearch.length > 1,
  })

  // ── Kit handlers ──────────────────────────────────────────────
  const addItem = useCallback(
    (product: Product, kitComponents?: KitComponentOverride[]) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id)
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  subtotal: (i.quantity + 1) * i.unitPrice * (1 - i.discount / 100),
                  ...(kitComponents ? { kitComponents } : {}),
                }
              : i
          )
        }
        return [
          ...prev,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: product.priceList ?? product.price ?? 0,
            discount: 0,
            subtotal: product.priceList ?? product.price ?? 0,
            kitComponents,
          },
        ]
      })
      setProductSearch('')
    },
    []
  )

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      if (product.isKit) {
        try {
          const res = await productsApi.getComponents(product.id)
          setKitEditorComponents(res.data as ProductComponent[])
        } catch {
          setKitEditorComponents([])
        }
        setKitEditorProduct(product)
        setProductSearch('')
      } else {
        addItem(product)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  )

  const handleKitEditorConfirm = (components: KitComponentOverride[]) => {
    if (kitEditorProduct) addItem(kitEditorProduct, components)
    setKitEditorProduct(null)
    setKitEditorComponents([])
  }

  const handleMerlinImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setParsingImage(true)
    setParsedPreview(null)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const res = await quotationsApi.parseQuotationImage(base64, file.type || 'image/jpeg')
      const parsed = res.data

      // Pre-fill client search with detected name
      if (parsed.clientName) {
        setClientSearch(parsed.clientName)
        setParsedPreview(
          `IA detectó: "${parsed.clientName}" · ${parsed.items.length} producto(s). ` +
          `Selecciona el cliente de la lista y continúa al paso 2 — los productos ya estarán listos.`
        )
      }

      // Pre-fill notes
      if (parsed.notes) {
        setValue('notes', parsed.notes)
      }

      // Pre-populate items (best-effort: match by name/reference)
      if (parsed.items.length > 0) {
        const searchedItems = await Promise.allSettled(
          parsed.items.map(async (pi) => {
            const query = pi.productReference || pi.productName
            const r = await productsApi.getAll({ search: query, pageSize: 3 }).then((x) => x.data)
            const match = r.data?.[0]
            if (!match) return null
            return {
              productId: match.id,
              product: match,
              quantity: pi.qty || 1,
              unitPrice: pi.unitPrice || (match.priceList ?? match.price ?? 0),
              discount: pi.discount || 0,
              subtotal: (pi.unitPrice || (match.priceList ?? match.price ?? 0)) * (pi.qty || 1) * (1 - (pi.discount || 0) / 100),
            } as LineItem
          })
        )
        const matched = searchedItems
          .filter((r): r is PromiseFulfilledResult<LineItem | null> => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value!)
        if (matched.length > 0) setItems(matched)
      }

      toast.success(`IA procesó la imagen — ${parsed.items.length} producto(s) detectado(s)`)
    } catch {
      toast.error('No se pudo procesar la imagen. Intenta con una foto más clara.')
    } finally {
      setParsingImage(false)
    }
  }

  const updateItem = (id: string, field: 'quantity' | 'unitPrice' | 'discount', value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== id) return item
        const updated = { ...item, [field]: value }
        updated.subtotal = updated.quantity * updated.unitPrice * (1 - updated.discount / 100)
        return updated
      })
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== id))
  }

  // ── Totals ────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const taxAmount = applyTax ? subtotal * TAX_RATE : 0
  const total = subtotal + taxAmount

  // ── Mutations ─────────────────────────────────────────────────
  const buildPayload = (formData: FormValues) => ({
    validityDays: Number(formData.validityDays),
    paymentTerms: formData.paymentTerms,
    followUpDate: formData.followUpDate
      ? new Date(formData.followUpDate + 'T12:00:00').toISOString()
      : undefined,
    notes: formData.notes || undefined,
    shippingAddress: formData.shippingAddress || undefined,
    taxPercent: applyTax ? TAX_RATE * 100 : 0,
    items: items.map((i) => ({
      productId: i.productId,
      qty: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      kitComponents: i.kitComponents?.map((kc) => ({
        componentId: kc.componentId,
        qty: kc.qty,
      })),
    })) as never,
  })

  const createMutation = useMutation({
    mutationFn: (data: { status: string; formData: FormValues }) =>
      quotationsApi.create({
        clientId: selectedClient!.id,
        status: data.status as 'BORRADOR' | 'ENVIADA',
        ...buildPayload(data.formData),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotización creada')
      navigate('/cotizaciones', { state: { newId: res.data.id } })
    },
    onError: () => toast.error('Error al crear la cotización'),
  })

  const updateMutation = useMutation({
    mutationFn: (formData: FormValues) =>
      quotationsApi.update(id!, buildPayload(formData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      toast.success('Cotización actualizada')
      navigate('/cotizaciones')
    },
    onError: () => toast.error('Error al actualizar la cotización'),
  })

  const formData = watch()
  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Loading state (edit mode only) ───────────────────────────
  if (isEditMode && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando cotización...
      </div>
    )
  }

  const cotNum = existingQuotation?.number
    ? `# ${String(existingQuotation.number).padStart(5, '0')}`
    : ''

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Kit editor modal */}
      {kitEditorProduct && (
        <KitEditor
          product={kitEditorProduct}
          defaultComponents={kitEditorComponents}
          onConfirm={handleKitEditorConfirm}
          onClose={() => {
            setKitEditorProduct(null)
            setKitEditorComponents([])
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/cotizaciones')}
        >
          Cotizaciones
        </Button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">
          {isEditMode ? `Editar Cotización ${cotNum}` : 'Nueva Cotización'}
        </span>
      </div>

      {/* Step indicator */}
      {(() => {
        const STEPS_CONFIG = [
          { emoji: '👤', label: 'Cliente', desc: '¿Para quién?' },
          { emoji: '📦', label: 'Productos', desc: '¿Qué va a comprar?' },
          { emoji: '⚙️', label: 'Pago', desc: '¿Cómo paga?' },
          { emoji: '✅', label: 'Confirmar', desc: 'Revisa y listo' },
        ]
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              {STEPS_CONFIG.map((s, i) => {
                const stepNum = i + 1
                const isActive = step === stepNum
                const isDone = step > stepNum
                return (
                  <div key={s.label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-base sm:text-lg font-semibold transition-all mb-1 ${
                        isDone ? 'bg-green-500 text-white shadow-sm' :
                        isActive ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isDone ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s.emoji}
                      </div>
                      <p className={`text-[10px] sm:text-xs font-semibold text-center ${isActive ? 'text-blue-700' : isDone ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</p>
                      <p className={`hidden sm:block text-[10px] ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>{s.desc}</p>
                    </div>
                    {i < 3 && (
                      <div className={`h-0.5 mx-1 mb-4 flex-shrink-0 ${step > stepNum ? 'bg-green-400' : 'bg-gray-100'}`} style={{width: 16}} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{width: `${((step - 1) / 3) * 100}%`}} />
            </div>
            <p className="text-center text-xs text-gray-400 mt-1">Paso {step} de 4</p>
          </div>
        )
      })()}

      {/* ── Step 1: Client ──────────────────────────────────────── */}
      {step === 1 && (
        <>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Paso 1 — Selecciona el cliente</p>
            <p className="text-xs text-blue-600">Escribe el nombre o empresa del cliente en el buscador de abajo</p>
          </div>
        </div>

        {/* Importar desde Merlin con IA */}
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Importar cotización de Merlin</p>
                <p className="text-xs text-amber-600">Toma una captura de pantalla en Merlin y súbela — la IA extrae el cliente y los productos automáticamente.</p>
              </div>
            </div>
            <label className={`flex items-center gap-1.5 cursor-pointer rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors ${parsingImage ? 'opacity-60 pointer-events-none' : ''}`}>
              {parsingImage ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />Procesando...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" />Subir imagen</>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleMerlinImageUpload} disabled={parsingImage} />
            </label>
          </div>
          {parsedPreview && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-1.5">{parsedPreview}</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Buscar cliente por nombre o empresa..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                prefix={<Search className="h-4 w-4" />}
              />
              {clientResults?.data?.length && clientSearch.length > 0 ? (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {clientResults.data.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      onClick={() => {
                        setSelectedClient(client)
                        setClientSearch('')
                        // Pre-fill shipping address with client address if field is empty
                        if (!watch('shippingAddress') && client.address) {
                          setValue('shippingAddress', client.address)
                        }
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                        {client.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{client.name}</p>
                        {client.company && (
                          <p className="text-xs text-gray-500 truncate">{client.company}</p>
                        )}
                      </div>
                      <ClientCategoryBadge category={client.category} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedClient && (
              <>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                      {selectedClient.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedClient.name}</p>
                      {selectedClient.company && (
                        <p className="text-sm text-gray-600">{selectedClient.company}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {selectedClient.city} · {selectedClient.paymentDays} días de pago
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <ClientCategoryBadge category={selectedClient.category} />
                    <p className="text-xs text-gray-500 mt-1">
                      Cupo: {formatCOP(selectedClient.creditLimit)}
                    </p>
                  </div>
                </div>
              </div>
              {(() => {
                const disc = CATEGORY_DISCOUNTS[selectedClient.category]
                if (!disc) return null
                return (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
                    <span className="text-xl mt-0.5">💡</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        ¡Recuerda el descuento! Este cliente es <strong>{disc.label} ({disc.code})</strong>
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Aplica un <strong>{disc.pct}%</strong> de descuento en los productos del paso 2.
                      </p>
                    </div>
                  </div>
                )
              })()}
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedClient}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* ── Step 2: Products ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Paso 2 — Agrega los productos</p>
              <p className="text-xs text-green-600">Escribe el nombre del producto y haz clic en él para agregarlo. Puedes cambiar cantidades después.</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Agregar productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="Buscar producto por referencia o nombre..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  prefix={<Search className="h-4 w-4" />}
                />
                {productResults?.data?.length && productSearch.length > 1 ? (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {productResults.data.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        onClick={() => handleSelectProduct(product)}
                      >
                        {product.isKit ? (
                          <Package className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {product.reference} — {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCOP(product.priceList ?? product.price ?? 0)} · Stock: {product.stock}
                            {product.isKit && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 font-medium">
                                Kit
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-xl mt-3">
                  <Plus className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="font-medium text-gray-500">Ningún producto agregado</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Escribe el nombre o referencia arriba y selecciona de la lista
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-32">Cant.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-36">Precio</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-56">
                        <span className="inline-flex items-center gap-1">
                          Descuento{' '}
                          <Hint text="Escribe el % de descuento o el precio final que quieres cobrar — el otro campo se calcula solo." side="top" />
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-32">Subtotal</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <>
                        <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">
                            {item.product.reference}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900 max-w-[200px]">
                            <div className="flex items-center gap-1.5 truncate">
                              {item.product.isKit && (
                                <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              )}
                              {item.product.name}
                            </div>
                          </td>
                          {/* Cantidad con flechas */}
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItem(item.productId, 'quantity', Math.max(1, item.quantity - 1))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.productId, 'quantity', Math.max(1, Number(e.target.value)))}
                                className="w-10 text-center rounded border border-gray-200 px-1 py-1 text-sm focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(item.productId, 'quantity', item.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          {/* Precio fijo con lápiz para editar */}
                          <td className="px-4 py-2">
                            {editingPriceId === item.productId ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.productId, 'unitPrice', Number(e.target.value))}
                                onBlur={() => setEditingPriceId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingPriceId(null)}
                                className="w-28 text-right rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 group">
                                <span className="font-medium text-gray-900">{formatCOP(item.unitPrice)}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingPriceId(item.productId)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          {/* Descuento: % y precio final vinculados */}
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={item.discount === 0 ? '' : item.discount}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const pct = Number(e.target.value)
                                    const newFinal = Math.round(item.unitPrice * (1 - pct / 100))
                                    updateItem(item.productId, 'discount', pct)
                                    setFinalPriceInputs((prev) => ({ ...prev, [item.productId]: String(newFinal) }))
                                  }}
                                  className="w-14 text-center rounded border border-gray-200 px-1.5 py-1 text-sm text-gray-400 focus:border-blue-400 focus:text-gray-900 focus:outline-none placeholder-gray-300"
                                />
                                <span className="text-xs text-gray-400">%</span>
                              </div>
                              <span className="text-gray-300 text-xs">·</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    finalPriceInputs[item.productId] !== undefined
                                      ? finalPriceInputs[item.productId]
                                      : item.discount === 0
                                      ? ''
                                      : Math.round(item.unitPrice * (1 - item.discount / 100))
                                  }
                                  placeholder={formatCOP(item.unitPrice).replace('$\u00a0', '').replace(/\./g, '')}
                                  onFocus={() =>
                                    setFinalPriceInputs((prev) => ({
                                      ...prev,
                                      [item.productId]: String(Math.round(item.unitPrice * (1 - item.discount / 100))),
                                    }))
                                  }
                                  onChange={(e) => {
                                    setFinalPriceInputs((prev) => ({ ...prev, [item.productId]: e.target.value }))
                                  }}
                                  onBlur={(e) => {
                                    const finalPrice = Number(e.target.value)
                                    if (finalPrice > 0 && item.unitPrice > 0) {
                                      const pct = Math.round(((item.unitPrice - finalPrice) / item.unitPrice) * 10000) / 100
                                      updateItem(item.productId, 'discount', Math.max(0, Math.min(100, pct)))
                                    } else if (finalPrice === 0 || e.target.value === '') {
                                      updateItem(item.productId, 'discount', 0)
                                    }
                                    setFinalPriceInputs((prev) => {
                                      const next = { ...prev }
                                      delete next[item.productId]
                                      return next
                                    })
                                  }}
                                  className="w-24 text-right rounded border border-gray-200 px-1.5 py-1 text-sm text-gray-400 focus:border-blue-400 focus:text-gray-900 focus:outline-none placeholder-gray-300"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatCOP(item.subtotal)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        {item.product.isKit && item.kitComponents && item.kitComponents.length > 0 && (
                          <tr key={`${item.productId}-kit`} className="border-b border-gray-100 bg-blue-50/40">
                            <td colSpan={7} className="px-4 py-1.5">
                              <div className="flex flex-wrap gap-2">
                                {item.kitComponents.map((kc) => (
                                  <span
                                    key={kc.componentId}
                                    className="inline-flex items-center gap-1 rounded-full bg-white border border-blue-100 px-2 py-0.5 text-xs text-gray-600"
                                  >
                                    <span className="font-mono text-blue-500">{kc.reference}</span>
                                    <span>{kc.qty} {kc.unit}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-100 p-4">
                <div className="flex flex-col gap-1.5 items-end text-sm">
                  <div className="flex items-center gap-8">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium w-32 text-right">{formatCOP(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyTax}
                        onChange={(e) => setApplyTax(e.target.checked)}
                        className="rounded"
                      />
                      IVA 19%
                      <Hint
                        text="El IVA (19%) aplica para la mayoría de clientes. Algunos clientes exentos no lo requieren."
                        side="top"
                      />
                    </label>
                    <span className="font-medium w-32 text-right">{formatCOP(taxAmount)}</span>
                  </div>
                  <div className="flex items-center gap-8 border-t border-gray-200 pt-1.5 mt-0.5">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-blue-700 text-base w-32 text-right">
                      {formatCOP(total)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Atrás
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={items.length === 0}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Conditions + Shipping ───────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-sm font-semibold text-purple-800">Paso 3 — Condiciones</p>
              <p className="text-xs text-purple-600">¿Cuánto tiempo tiene para decidir? ¿Cómo va a pagar? Solo haz clic en las opciones.</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Condiciones de la cotización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Validez */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Validez</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {[5, 10, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValue('validityDays', d)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        watch('validityDays') === d
                          ? 'bg-blue-600 text-white border-transparent shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Otro"
                      {...register('validityDays')}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-400">días</span>
                  </div>
                </div>
              </div>

              {/* Forma de pago */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Forma de pago</p>
                <div className="flex flex-wrap gap-2">
                  {['Contado', '15 días', '30 días', '45 días', '60 días', 'Crédito acordado'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValue('paymentTerms', opt)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        watch('paymentTerms') === opt
                          ? 'bg-blue-600 text-white border-transparent shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seguimiento */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Próximo seguimiento
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(¿cuándo llamar al cliente?)</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: 'En 3 días', days: 3 },
                    { label: 'En 1 semana', days: 7 },
                    { label: 'En 2 semanas', days: 14 },
                    { label: 'En 1 mes', days: 30 },
                  ].map(({ label, days }) => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    const iso = d.toISOString().split('T')[0]
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setValue('followUpDate', iso)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          watch('followUpDate') === iso
                            ? 'bg-blue-600 text-white border-transparent shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                  <input
                    type="date"
                    min="2024-01-01"
                    max="2035-12-31"
                    {...register('followUpDate')}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {watch('followUpDate') && (
                  <p className="text-xs text-blue-600 font-medium">
                    Seguimiento el {new Date(watch('followUpDate') + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>

              <Input
                label="Dirección de envío"
                placeholder="Ej: Carrera 7 # 45-28, Bogotá, Cundinamarca"
                hint="Aparece en la etiqueta de envío del PDF. Se prellenó con la dirección del cliente."
                {...register('shippingAddress')}
              />
              <Textarea
                label="Observaciones"
                placeholder="Incluye notas, condiciones especiales, garantías..."
                rows={3}
                {...register('notes')}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Vista previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-semibold text-gray-900">{selectedClient?.name}</p>
                    <p className="text-sm text-gray-600">{selectedClient?.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Fecha</p>
                    <p className="font-medium">{formatDate(new Date())}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Válida {formData.validityDays} días
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    {items.length} productos
                  </p>
                  {items.slice(0, 3).map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600 flex items-center gap-1">
                        {item.product.isKit && <Package className="h-3 w-3 text-blue-400" />}
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="font-medium">{formatCOP(item.subtotal)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-gray-400">+{items.length - 3} productos más</p>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCOP(subtotal)}</span>
                  </div>
                  {applyTax && (
                    <div className="flex justify-between text-gray-600">
                      <span>IVA (19%)</span>
                      <span>{formatCOP(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                    <span>Total</span>
                    <span className="text-blue-700">{formatCOP(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Atrás
            </Button>
            <Button
              onClick={() => setStep(4)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continuar — Revisar cotización
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirm & Send ──────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Banner */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Paso 4 — Todo listo</p>
              <p className="text-xs text-emerald-600">Revisa que todo esté correcto y elige qué hacer con la cotización.</p>
            </div>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Resumen de la cotización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-semibold text-gray-900">{selectedClient?.name}</p>
                    <p className="text-sm text-gray-600">{selectedClient?.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Válida por</p>
                    <p className="font-semibold text-gray-900">{formData.validityDays} días</p>
                    <p className="text-xs text-gray-500 mt-1">{formData.paymentTerms}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600 flex items-center gap-1">
                        {item.product.isKit && <Package className="h-3 w-3 text-blue-400" />}
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="font-medium">{formatCOP(item.subtotal)}</span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <p className="text-xs text-gray-400">+{items.length - 4} más</p>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                  {applyTax && (
                    <div className="flex justify-between text-gray-500">
                      <span>IVA (19%)</span>
                      <span>{formatCOP(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-lg pt-1">
                    <span>Total cotización</span>
                    <span className="text-blue-700">{formatCOP(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save options - crystal clear */}
          {isEditMode ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">¿Qué quieres hacer?</p>
              <button
                disabled={isSaving}
                onClick={() => updateMutation.mutate(formData)}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
              >
                <span className="text-3xl mt-0.5">💾</span>
                <div>
                  <p className="font-semibold text-blue-900">Guardar cambios</p>
                  <p className="text-sm text-blue-700 mt-0.5">Se actualiza la cotización con los nuevos datos.</p>
                </div>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">¿Qué quieres hacer con la cotización?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  disabled={isSaving}
                  onClick={() => createMutation.mutate({ status: 'BORRADOR', formData })}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-3xl mt-0.5">💾</span>
                  <div>
                    <p className="font-semibold text-gray-900">Solo guardar</p>
                    <p className="text-sm text-gray-500 mt-0.5">La cotización queda guardada. <strong>No se envía al cliente todavía.</strong> Puedes editarla después.</p>
                  </div>
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => createMutation.mutate({ status: 'ENVIADA', formData })}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors text-left ring-2 ring-blue-100"
                >
                  <span className="text-3xl mt-0.5">📤</span>
                  <div>
                    <p className="font-semibold text-blue-900">Ya la envié al cliente</p>
                    <p className="text-sm text-blue-700 mt-0.5">Marca que ya se la enviaste por WhatsApp o correo. Queda registrada como enviada.</p>
                  </div>
                </button>
              </div>
              {isSaving && (
                <p className="text-center text-sm text-blue-600 mt-3 animate-pulse">Guardando cotización...</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-start">
            <Button variant="outline" onClick={() => setStep(3)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Atrás
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
