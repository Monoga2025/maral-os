import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Landmark, ShieldCheck, Download, ExternalLink,
  Copy, Printer, CreditCard, Calendar, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react'
import { invoicesApi, dianApi } from '../lib/api'
import { formatCOP, formatDate, getStatusColor } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { toast } from 'sonner'
import type { Invoice, DIANInvoiceStatus } from '../types'

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
    >
      <Copy size={13} />
      {copied ? '¡Copiado!' : label}
    </button>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [paymentAmount, setPaymentAmount] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [isDianAction, setIsDianAction] = useState(false)

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  })
  const invoice: Invoice | undefined = invoiceData?.data

  const { data: dianStatus, refetch: refetchDian, isLoading: dianLoading } = useQuery<DIANInvoiceStatus>({
    queryKey: ['dian-status', id],
    queryFn: () => dianApi.getStatus(id!).then((r) => r.data),
    enabled: !!id,
  })

  const registerPaymentMutation = useMutation({
    mutationFn: (amount: number) => invoicesApi.registerPayment(id!, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['credit-summary'] })
      toast.success('Pago registrado exitosamente')
      setIsPaying(false)
      setPaymentAmount('')
    },
    onError: () => toast.error('Error al registrar pago'),
  })

  const handleEmitDian = async () => {
    if (!id) return
    try {
      setIsDianAction(true)
      toast.info('Generando UBL 2.1 y CUFE...')
      await dianApi.generateUBL(id)
      toast.info('Transmitiendo a la DIAN...')
      const sendRes = await dianApi.sendToDian(id)
      if (sendRes.data.success || sendRes.data.status === 'ACEPTADA') {
        toast.success('🎉 ¡Factura aprobada y aceptada por la DIAN!')
      } else {
        toast.warning(`Estado DIAN: ${sendRes.data.status}`)
      }
      refetchDian()
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al emitir factura DIAN')
    } finally {
      setIsDianAction(false)
    }
  }

  const printOfficialInvoice = () => {
    if (!invoice) return
    const w = window.open('', '_blank')
    if (!w) return
    const cufe = dianStatus?.cufe ?? 'PENDIENTE'
    const subtotal = Math.round(invoice.amount / 1.19)
    const iva = invoice.amount - subtotal
    const qrUrl = cufe !== 'PENDIENTE' ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}` : ''

    w.document.write(`
      <html>
        <head>
          <title>Factura Electrónica #${invoice.number}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; font-size: 12px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .company { font-size: 16px; font-weight: bold; color: #0f172a; }
            .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .cufe-box { background: #f1f5f9; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 10px; word-break: break-all; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            .totals { margin-top: 15px; width: 300px; margin-left: auto; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .total-row { font-size: 14px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 6px; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S.</div>
              <div>NIT: 900.123.456-1 · Régimen Común</div>
              <div>Calle 3 # 6A-22 Bodega 101 · Curití, Santander</div>
              <div>Tel: 316 776 0692 · ventas@industriasmaral.com</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">FACTURA ELECTRÓNICA DE VENTA</span>
              <div style="font-size: 18px; font-weight: bold; margin-top: 6px; color: #2563eb;">No. FE-${invoice.number}</div>
              <div>Fecha: ${formatDate(invoice.createdAt)}</div>
              <div>Vencimiento: ${formatDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <b>DATOS DEL CLIENTE / ADQUIRIENTE:</b><br/>
              <b>Nombre/Razón Social:</b> ${invoice.client?.name ?? ''} ${invoice.client?.company ? `(${invoice.client.company})` : ''}<br/>
              <b>Estado en Cartera:</b> ${invoice.status}
            </div>
            <div class="box">
              <b>INFORMACIÓN TRIBUTARIA DIAN:</b><br/>
              <b>Resolución DIAN:</b> 18760000001 (Vigente 2024-2025)<br/>
              <b>Prefijo y Rango:</b> FE (1 al 10000)<br/>
              <b>Medio de Pago:</b> ${invoice.status === 'PAGADA' ? 'Contado' : 'Crédito 30 días'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Concepto / Descripción</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Servicios / Equipos según Pedido #${invoice.order?.number ?? invoice.orderId ?? 'N/A'}</td>
                <td style="text-align: right;">${formatCOP(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal:</span> <span>${formatCOP(subtotal)}</span></div>
            <div><span>IVA (19%):</span> <span>${formatCOP(iva)}</span></div>
            <div class="total-row"><span>Total Factura:</span> <span>${formatCOP(invoice.amount)}</span></div>
          </div>

          <div class="cufe-box">
            <b>CUFE:</b> ${cufe}
          </div>

          ${qrUrl ? `<div style="text-align:center; margin: 15px 0;"><a href="${qrUrl}" target="_blank" style="color:#2563eb; text-decoration:none; font-weight:bold;">Validar documento directamente en el catálogo web DIAN &rarr;</a></div>` : ''}

          <div class="footer">
            Esta factura electrónica de venta cumple con todos los requisitos del Decreto 2242 y el Anexo Técnico 1.9 de la DIAN. Representación gráfica oficial emitida por MARAL OS.
          </div>
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Factura no encontrada</h2>
        <p className="text-xs text-slate-500 mt-1">El registro solicitado no existe o fue reubicado.</p>
        <Link to="/credito" className="inline-block mt-4 text-xs font-bold text-blue-600 hover:underline">
          &larr; Volver a Crédito y Cartera
        </Link>
      </div>
    )
  }

  const cufe = dianStatus?.cufe
  const currentDianStatus = dianStatus?.status ?? 'NO_GENERADO'
  const qrUrl = cufe ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}` : null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Factura #{invoice.number}</h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Emitida el {formatDate(invoice.createdAt)} · Vence el {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={printOfficialInvoice}
            variant="outline"
            leftIcon={<Printer size={15} />}
            className="rounded-2xl"
          >
            Imprimir PDF Oficial
          </Button>
          <Button
            onClick={handleEmitDian}
            loading={isDianAction}
            leftIcon={<Landmark size={15} />}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
          >
            {currentDianStatus === 'ACEPTADA' ? 'Re-validar con DIAN' : 'Transmitir a DIAN'}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column (2 cols) */}
        <div className="md:col-span-2 space-y-5">
          {/* DIAN Electronic Status Card */}
          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Landmark size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Estado de Facturación Electrónica DIAN</h2>
                  <p className="text-[11px] text-slate-400">Anexo Técnico 1.9 UBL 2.1 Colombia</p>
                </div>
              </div>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${
                  currentDianStatus === 'ACEPTADA'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : currentDianStatus === 'RECHAZADA' || currentDianStatus === 'ERROR'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : currentDianStatus === 'EN_PROCESO' || currentDianStatus === 'PENDIENTE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentDianStatus}
              </span>
            </div>

            {currentDianStatus === 'ACEPTADA' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-100 p-3 rounded-2xl">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>Documento validado y aceptado oficialmente ante la DIAN.</span>
                </div>

                {cufe && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                      Código CUFE Oficial
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-[11px] text-slate-700 break-all select-all">
                        {cufe}
                      </div>
                      <CopyButton text={cufe} label="Copiar" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {qrUrl && (
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-colors"
                    >
                      <ExternalLink size={13} />
                      Consultar en Catálogo DIAN
                    </a>
                  )}
                  <a
                    href={dianApi.getXmlUrl(invoice.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-bold rounded-xl transition-colors"
                  >
                    <Download size={13} />
                    Descargar XML UBL Firmado
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 mb-3">
                  Esta factura aún no ha sido emitida ni transmitida al servicio web de la DIAN.
                </p>
                <Button
                  onClick={handleEmitDian}
                  loading={isDianAction}
                  leftIcon={<Landmark size={14} />}
                  className="text-xs rounded-xl"
                >
                  Emitir Factura Electrónica Ahora
                </Button>
              </div>
            )}
          </Card>

          {/* Client & Order details */}
          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Detalle Comercial
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase">Cliente</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {invoice.client?.name ?? 'Cliente General'}
                </p>
                {invoice.client?.company && (
                  <p className="text-slate-500">{invoice.client.company}</p>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase">Pedido Asociado</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {invoice.order ? (
                    <Link to={`/pedidos/${invoice.order.id}`} className="text-blue-600 hover:underline">
                      Pedido #{invoice.order.number}
                    </Link>
                  ) : (
                    'Sin pedido vinculado'
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (Financial & Payments) */}
        <div className="space-y-5">
          {/* Amount Card */}
          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-xs space-y-4 bg-gradient-to-br from-white to-slate-50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monto de la Factura</h2>
            <div>
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {formatCOP(invoice.amount)}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Incluye IVA del 19%</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal antes de IVA:</span>
                <span className="font-bold text-slate-800">{formatCOP(Math.round(invoice.amount / 1.19))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA 19%:</span>
                <span className="font-bold text-slate-800">{formatCOP(invoice.amount - Math.round(invoice.amount / 1.19))}</span>
              </div>
            </div>
          </Card>

          {/* Payment action card */}
          {invoice.status !== 'PAGADA' && (
            <Card className="p-6 rounded-3xl border-slate-200/90 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" />
                Registrar Pago / Abono
              </h3>

              <div className="space-y-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Monto (ej: ${invoice.amount})`}
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                />
                <Button
                  onClick={() => {
                    const amt = parseFloat(paymentAmount)
                    if (isNaN(amt) || amt <= 0) { toast.error('Ingresa un monto válido'); return }
                    registerPaymentMutation.mutate(amt)
                  }}
                  loading={registerPaymentMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs rounded-2xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Registrar Pago Completo
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
