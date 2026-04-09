import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, AlertTriangle, Plus, Trash2, Check } from 'lucide-react'
import { ordersApi, clientsApi, productsApi } from '../lib/api'
import { formatCOP } from '../lib/utils'
import type { Client, Product } from '../types'
import { toast } from 'sonner'
import { Hint } from '../components/ui/Hint'

interface LineItem { productId: string; product?: Product; qty: number; unitPrice: number }

const CARRIERS = ['Servientrega', 'Interrapidísimo', 'TCC', 'Coordinadora', 'Envía', 'Otra']

export default function OrderForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [step, setStep] = useState(1)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [carrier, setCarrier] = useState('')
  const [freightPayer, setFreightPayer] = useState('Remitente')
  const [freightPayment, setFreightPayment] = useState('Nequi')
  const [type, setType] = useState<'PEDIDO' | 'GARANTIA' | 'MUESTRA'>('PEDIDO')
  const [notes, setNotes] = useState('')

  const { data: clientsData } = useQuery({
    queryKey: ['clients-search', clientSearch],
    queryFn: () => clientsApi.getAll({ search: clientSearch, pageSize: 10 }),
    enabled: clientSearch.length > 1,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch, pageSize: 10 }),
    enabled: productSearch.length > 1,
  })

  const clients: Client[] = clientsData?.data.data ?? []
  const products: Product[] = productsData?.data.data ?? []

  const addItem = (product: Product) => {
    if (items.find((i) => i.productId === product.id)) return
    setItems((prev) => [...prev, { productId: product.id, product, qty: 1, unitPrice: (product.priceList ?? product.price) || 0 }])
    setProductSearch('')
  }

  const removeItem = (productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId))

  const updateItem = (productId: string, field: 'qty' | 'unitPrice', value: number) => {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, [field]: value } : i))
  }

  const total = items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0)

  const createOrder = useMutation({
    mutationFn: () => ordersApi.create({
      clientId: selectedClient!.id,
      confirmed,
      recipientName,
      address,
      city,
      phone,
      carrier,
      freightPayer,
      freightPayment,
      type,
      notes,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })),
    } as never),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Pedido creado')
      navigate(`/pedidos/${res.data.id}`)
    },
    onError: () => toast.error('Error al crear el pedido'),
  })

  const canSubmit = selectedClient && items.length > 0 && recipientName && address && carrier

  const submitLabel = !selectedClient
    ? 'Selecciona un cliente primero'
    : items.length === 0
    ? 'Agrega al menos un producto'
    : 'Crear Pedido'

  const STEPS = ['1. Cliente y Productos', '2. Datos de Envío', '3. Confirmar']

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pedidos')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
      </div>

      {/* Step wizard */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all shrink-0 ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-gray-200" />}
            </div>
          )
        })}
      </div>

      {/* STEP 1: Client + Products */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Cliente</h2>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <p className="font-semibold text-blue-900">{selectedClient.name}</p>
                  <p className="text-sm text-blue-600">{selectedClient.company} · {selectedClient.city}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-blue-400 hover:text-blue-600 text-xs underline">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o empresa..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {clients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(''); setRecipientName(c.name); setPhone(c.phone ?? ''); setAddress(c.address ?? ''); setCity(c.city ?? '') }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400 ml-2">{c.company} · {c.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Productos</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto por nombre o referencia..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {products.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex justify-between"
                    >
                      <span><span className="font-medium">{p.name}</span> <span className="text-gray-400">{p.reference}</span></span>
                      <span className="text-blue-600 font-medium">{formatCOP((p.priceList ?? p.price) || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-blue-100 rounded-xl bg-blue-50/40 mt-2">
                <Plus className="h-7 w-7 text-blue-300 mb-2" />
                <p className="font-medium text-blue-700 text-sm">Ningún producto agregado</p>
                <p className="text-xs text-blue-500 mt-1">Escribe el nombre del producto en la barra de búsqueda y selecciónalo de la lista</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-3 text-right">Precio</div>
                  <div className="col-span-1 text-right">Sub.</div>
                  <div className="col-span-1" />
                </div>
                {items.map((item) => (
                  <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-2">
                    <div className="col-span-5 text-sm font-medium truncate">{item.product?.name}</div>
                    <div className="col-span-2">
                      <input type="number" min={1} value={item.qty}
                        onChange={(e) => updateItem(item.productId, 'qty', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" min={0} value={item.unitPrice}
                        onChange={(e) => updateItem(item.productId, 'unitPrice', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-1 text-xs font-semibold text-right">{formatCOP(item.qty * item.unitPrice)}</div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 text-lg font-bold text-gray-900 border-t border-gray-200">
                  Total: {formatCOP(total)}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedClient || items.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Shipping */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Datos de Envío</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Destinatario *</label>
                <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Carlos Rodríguez (persona que recibe)"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Teléfono destino</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Dirección completa *</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Calle 45 # 23-12 Bodega 3"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Ciudad</label>
                <input value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Bogotá, Medellín, Cali"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Transportadora *</label>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 font-medium">Quién paga el flete</label>
                  <Hint text="Si el cliente lo paga se llama flete en cobro. Si Maral lo paga, es flete prepagado." side="top" />
                </div>
                <select value={freightPayer} onChange={(e) => setFreightPayer(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Remitente</option>
                  <option>Destinatario</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 font-medium">Forma de pago flete</label>
                  <Hint text="Cómo se le pagó a la transportadora al momento del despacho." side="top" />
                </div>
                <select value={freightPayment} onChange={(e) => setFreightPayment(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Nequi</option>
                  <option>Efectivo</option>
                  <option>Ya pagado</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 font-medium">Tipo de pedido</label>
                  <Hint text="Garantía es para reponer un producto con falla sin cobrar. Muestra es para que el cliente evalúe el producto." side="top" />
                </div>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="PEDIDO">Pedido</option>
                  <option value="GARANTIA">Garantía</option>
                  <option value="MUESTRA">Muestra</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Observaciones</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft size={16} /> Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!recipientName || !address || !carrier}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Resumen del pedido</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Cliente</p>
                <p className="font-semibold text-gray-900">{selectedClient?.name}</p>
                <p className="text-xs text-gray-500">{selectedClient?.company}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Productos</p>
                <p className="font-semibold text-gray-900">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-500">Total: {formatCOP(total)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Destino</p>
                <p className="font-semibold text-gray-900">{recipientName}</p>
                <p className="text-xs text-gray-500">{city} — {address}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium uppercase mb-1">Transportadora</p>
                <p className="font-semibold text-gray-900">{carrier}</p>
                <p className="text-xs text-gray-500">Paga: {freightPayer} · {freightPayment}</p>
              </div>
            </div>

            {/* Items summary */}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.qty}x {item.product?.name}</span>
                  <span className="font-medium">{formatCOP(item.qty * item.unitPrice)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-blue-700">{formatCOP(total)}</span>
              </div>
            </div>
          </div>

          {/* Confirmed toggle */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <button
              onClick={() => setConfirmed(!confirmed)}
              className={`w-12 h-6 rounded-full transition-colors ${confirmed ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${confirmed ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-900">Pedido Confirmado</p>
              <p className="text-xs text-gray-500">El cliente ya consignó. Solo se puede procesar cuando está confirmado.</p>
            </div>
          </div>

          {!confirmed && (
            <div className="flex items-center gap-2 text-orange-700 text-sm bg-orange-50 border border-orange-200 rounded-lg p-3">
              <AlertTriangle size={15} />
              El pedido se guardará pero no pasará a producción hasta confirmar.
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft size={16} /> Atrás
            </button>
            <div className="flex gap-3">
              <button onClick={() => navigate('/pedidos')} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => createOrder.mutate()}
                disabled={!canSubmit || createOrder.isPending}
                title={canSubmit ? undefined : submitLabel}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrder.isPending ? 'Guardando...' : submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
