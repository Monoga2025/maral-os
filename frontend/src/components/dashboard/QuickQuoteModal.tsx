import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap,
  X,
  Plus,
  Trash2,
  Download,
  MessageCircle,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { clientsApi, productsApi, quotationsApi } from '../../lib/api'
import { formatCOP } from '../../lib/utils'
import type { Client, Product } from '../../types'
import { Button } from '../ui/Button'

interface QuickQuoteModalProps {
  isOpen: boolean
  onClose: () => void
  initialClient?: { id: string; name: string } | null
}

interface QuoteItemRow {
  productId: string
  productName: string
  productRef: string
  qty: number
  unitPrice: number
  discount: number
}

export function QuickQuoteModal({ isOpen, onClose, initialClient }: QuickQuoteModalProps) {
  const queryClient = useQueryClient()

  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState<string>('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)

  const [productSearch, setProductSearch] = useState<string>('')
  const [items, setItems] = useState<QuoteItemRow[]>([])
  const [paymentTerms, setPaymentTerms] = useState<string>('CONTADO')
  const [notes, setNotes] = useState<string>('Cotización válida por 15 días calendario.')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ id: string; number: string | number; clientName: string; phone?: string } | null>(null)

  // Fetch clients for autocomplete
  const { data: clientsData } = useQuery({
    queryKey: ['clients-quick-list', clientSearch],
    queryFn: () => clientsApi.getAll({ search: clientSearch || undefined, pageSize: 25 }).then((r) => r.data),
    enabled: isOpen,
  })

  // Fetch products for quick selector
  const { data: productsData } = useQuery({
    queryKey: ['products-quick-list', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch || undefined, pageSize: 50, isActive: true }).then((r) => r.data),
    enabled: isOpen,
  })

  const clientsList = clientsData?.data || []
  const productsList = productsData?.data || []

  useEffect(() => {
    if (initialClient) {
      setSelectedClientId(initialClient.id)
      setClientSearch(initialClient.name)
    } else {
      setSelectedClientId('')
      setClientSearch('')
    }
    setItems([])
    setErrorMsg(null)
    setSuccessInfo(null)
  }, [initialClient, isOpen])

  const selectedClient = useMemo(() => {
    return clientsList.find((c) => c.id === selectedClientId)
  }, [clientsList, selectedClientId])

  const handleAddItem = (prod: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === prod.id)
    if (existingIndex >= 0) {
      const updated = [...items]
      updated[existingIndex].qty += 1
      setItems(updated)
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          productRef: prod.reference,
          qty: 1,
          unitPrice: prod.price || 0,
          discount: 0,
        },
      ])
    }
    setProductSearch('')
  }

  const handleUpdateItem = (index: number, field: keyof QuoteItemRow, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculations (IVA 19%)
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const itemPrice = it.qty * it.unitPrice
      const itemDisc = itemPrice * (it.discount / 100)
      return sum + (itemPrice - itemDisc)
    }, 0)
  }, [items])

  const iva = useMemo(() => Math.round(subtotal * 0.19), [subtotal])
  const total = subtotal + iva

  const createMutation = useMutation({
    mutationFn: async (actionType: 'SAVE' | 'PDF' | 'WHATSAPP') => {
      if (!selectedClientId) {
        throw new Error('Por favor selecciona un cliente')
      }
      if (items.length === 0) {
        throw new Error('Agrega al menos un producto a la cotización')
      }

      const payload = {
        clientId: selectedClientId,
        items: items.map((it) => ({
          productId: it.productId,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0),
        })),
        paymentTerms,
        notes,
      }

      const res = await quotationsApi.create(payload)
      return { quotation: res.data, actionType }
    },
    onSuccess: async ({ quotation, actionType }) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      const clientName = selectedClient?.name || initialClient?.name || 'Cliente'
      const clientPhone = selectedClient?.whatsapp || selectedClient?.phone

      if (actionType === 'PDF') {
        try {
          await quotationsApi.downloadPDF(quotation.id, quotation.number, clientName)
        } catch (e) {
          console.error('Error downloading PDF:', e)
        }
      }

      if (actionType === 'WHATSAPP') {
        const cleanPhone = (clientPhone || '').replace(/\D/g, '')
        const waNumber = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone
        const itemSummary = items.map((i) => `• ${i.qty}x ${i.productName}`).join('\n')
        const text = encodeURIComponent(
          `Hola ${clientName}, adjuntamos el detalle de tu cotización N° ${quotation.number} de MARAL Tecnología y Comunicaciones ⚡:\n\n${itemSummary}\n\n*Total Oficial: ${formatCOP(total)} (IVA incl.)*\n\n¿Deseas que procedamos con el pedido?`
        )
        if (waNumber) {
          window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank')
        } else {
          window.open(`https://wa.me/?text=${text}`, '_blank')
        }
      }

      setSuccessInfo({
        id: quotation.id,
        number: quotation.number,
        clientName,
        phone: clientPhone,
      })
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.error || err.message || 'Error al generar la cotización')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cotizador Flash (30 Segundos)
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Genera cotizaciones oficiales con IVA, PDF y WhatsApp en tiempo récord
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successInfo ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="mt-3 text-base font-bold text-slate-900">
                ¡Cotización #{successInfo.number} generada con éxito!
              </h4>
              <p className="mt-1 text-xs text-slate-600">
                Registrada para <strong className="text-slate-800">{successInfo.clientName}</strong>.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => quotationsApi.downloadPDF(successInfo.id, successInfo.number, successInfo.clientName)}
                  className="h-9 gap-1.5 font-medium"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF Oficial
                </Button>

                {successInfo.phone && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const cleanPhone = successInfo.phone!.replace(/\D/g, '')
                      const waNumber = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone
                      const text = encodeURIComponent(
                        `Hola ${successInfo.clientName}, adjuntamos tu cotización N° ${successInfo.number} de MARAL Tecnología y Comunicaciones.`
                      )
                      window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank')
                    }}
                    className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir en WhatsApp
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={onClose}
                  className="h-9 bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Client selector */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Cliente <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setIsClientDropdownOpen(true)
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Escribe el nombre del cliente o empresa..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {isClientDropdownOpen && clientsList.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {clientsList.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id)
                            setClientSearch(c.name + (c.company ? ` (${c.company})` : ''))
                            setIsClientDropdownOpen(false)
                          }}
                          className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{c.name}</p>
                            {c.company && <p className="text-[11px] text-slate-500">{c.company}</p>}
                          </div>
                          {c.city && <span className="text-[11px] text-slate-400">{c.city}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Add Products */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Agregar Productos <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1.5 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar producto por nombre o referencia (ej. Antena, Cable, Base)..."
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {productSearch.trim().length > 0 && productsList.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {productsList.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddItem(p)}
                          className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-500">Ref: {p.reference} • Stock: {p.stock}</p>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatCOP(p.price || 0)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Items Table */}
                {items.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Producto</th>
                          <th className="px-2 py-2.5 w-20">Cant.</th>
                          <th className="px-3 py-2.5 w-32">Precio Unit.</th>
                          <th className="px-2 py-2.5 w-20">Desc %</th>
                          <th className="px-3 py-2.5 w-28 text-right">Subtotal</th>
                          <th className="px-2 py-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => {
                          const itemTotal = item.qty * item.unitPrice * (1 - item.discount / 100)
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {item.productName}
                              </td>
                              <td className="px-2 py-2.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 rounded-lg border border-slate-300 px-1.5 py-1 text-center font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-28 rounded-lg border border-slate-300 px-1.5 py-1 text-right font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-2 py-2.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discount}
                                  onChange={(e) => handleUpdateItem(idx, 'discount', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                  className="w-16 rounded-lg border border-slate-300 px-1.5 py-1 text-center text-slate-900 focus:border-indigo-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                                {formatCOP(itemTotal)}
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Step 3: Terms & Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Forma de Pago
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CONTADO">Contado / Anticipado</option>
                    <option value="CREDITO_15_DIAS">Crédito a 15 días</option>
                    <option value="CREDITO_30_DIAS">Crédito a 30 días</option>
                    <option value="50_ANTICIPO_50_ENTREGA">50% Anticipo / 50% Contra Entrega</option>
                  </select>
                </div>

                {/* Calculation breakdown */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatCOP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (19%):</span>
                    <span className="font-semibold text-slate-900">{formatCOP(iva)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
                    <span>Total Oficial:</span>
                    <span className="text-indigo-700">{formatCOP(total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successInfo && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={createMutation.isPending || items.length === 0}
                onClick={() => createMutation.mutate('SAVE')}
                className="gap-1.5 font-medium rounded-xl"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                Solo Guardar
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={createMutation.isPending || items.length === 0}
                onClick={() => createMutation.mutate('PDF')}
                className="gap-1.5 font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
              >
                <Download className="h-4 w-4" />
                Guardar y PDF
              </Button>

              <Button
                size="sm"
                disabled={createMutation.isPending || items.length === 0}
                onClick={() => createMutation.mutate('WHATSAPP')}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs rounded-xl"
              >
                <MessageCircle className="h-4 w-4" />
                Guardar y WhatsApp
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
