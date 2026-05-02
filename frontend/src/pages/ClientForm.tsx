import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Hint } from '../components/ui/Hint'

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  company: z.string().optional(),
  rut: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  category: z.string().min(1),
  creditLimit: z.coerce.number().min(0),
  paymentDays: z.coerce.number().min(0),
  factoringStatus: z.enum(['APROBADO', 'EN_ESTUDIO', 'RECHAZADO', 'NO_APLICA']),
  purchaseFrequency: z.enum(['FRECUENTE', 'INTERMITENTE', 'ESPORADICA', 'NINGUNA']),
  isProvider: z.boolean().optional(),
  notes: z.string().optional(),
  // Contactos adicionales
  ownerName: z.string().optional(),
  purchaseContactName: z.string().optional(),
  secretaryName: z.string().optional(),
  otherContactName: z.string().optional(),
  // Perfil comercial
  companySizeScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  friendlinessLevel: z.enum(['poco', 'intermedio', 'mucho', 'muchísimo']).optional().nullable(),
  competitors: z.string().optional(),
  callNotes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PRODUCT_LINES_PREDEFINED = [
  { key: 'estacion_base', label: 'Línea Estación Base' },
  { key: 'movil', label: 'Línea Móvil' },
  { key: 'handy', label: 'Línea Handy' },
  { key: 'telemetria', label: 'Línea Telemetría' },
]

export default function ClientForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // productLines managed separately (not in react-hook-form due to complex structure)
  const [predefinedLines, setPredefinedLines] = useState<Record<string, boolean>>({})
  const [customLines, setCustomLines] = useState<string[]>([])
  const [newCustomLine, setNewCustomLine] = useState('')

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id!).then((r) => r.data),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'PROSPECTO',
      factoringStatus: 'NO_APLICA',
      purchaseFrequency: 'NINGUNA',
      creditLimit: 0,
      paymentDays: 30,
      isProvider: false,
    },
  })

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        company: client.company ?? '',
        rut: client.rut ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        whatsapp: client.whatsapp ?? '',
        city: client.city ?? '',
        address: client.address ?? '',
        category: client.category,
        creditLimit: client.creditLimit,
        paymentDays: client.paymentDays,
        factoringStatus: client.factoringStatus,
        purchaseFrequency: (client.purchaseFrequency as any) ?? 'NINGUNA',
        isProvider: client.isProvider ?? false,
        notes: client.notes ?? '',
        ownerName: client.ownerName ?? '',
        purchaseContactName: client.purchaseContactName ?? '',
        secretaryName: client.secretaryName ?? '',
        otherContactName: client.otherContactName ?? '',
        companySizeScore: client.companySizeScore ?? undefined,
        friendlinessLevel: (client.friendlinessLevel as any) ?? undefined,
        competitors: client.competitors ?? '',
        callNotes: client.callNotes ?? '',
      })
      const pl = client.productLines as any
      if (pl) {
        setPredefinedLines(pl.predefined ?? {})
        setCustomLines(pl.custom ?? [])
      }
    }
  }, [client, reset])

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        productLines: {
          predefined: predefinedLines,
          custom: customLines,
        },
      }
      return isEditing ? clientsApi.update(id!, payload) : clientsApi.create(payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(isEditing ? 'Cliente actualizado' : 'Cliente creado exitosamente')
      navigate(`/clientes/${res.data.id}`)
    },
    onError: () => {
      toast.error('Error al guardar el cliente')
    },
  })

  const addCustomLine = () => {
    const trimmed = newCustomLine.trim()
    if (!trimmed || customLines.includes(trimmed)) return
    setCustomLines((prev) => [...prev, trimmed])
    setNewCustomLine('')
  }

  const removeCustomLine = (line: string) => {
    setCustomLines((prev) => prev.filter((l) => l !== line))
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/clientes')}
        >
          Clientes
        </Button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        </span>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre empresa *" {...register('company')} placeholder="Ej: Meltec S.A.S." />
            <Input label="Nombre principal / Dueño *" {...register('name')} error={errors.name?.message} />
            <Input label="RUT / NIT" {...register('rut')} placeholder="900.123.456-7" />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Teléfono" {...register('phone')} placeholder="3001234567" />
            <Input label="WhatsApp" {...register('whatsapp')} placeholder="3001234567" />
            <Input label="Ciudad" placeholder="Ej: Bogotá" {...register('city')} />
            <Input label="Dirección" placeholder="Ej: Calle 45 # 23-12" {...register('address')} />
          </CardContent>
        </Card>

        {/* Contactos adicionales */}
        <Card>
          <CardHeader>
            <CardTitle>Contactos adicionales</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Personas clave dentro de la empresa cliente.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre dueño" {...register('ownerName')} placeholder="Ej: Carlos Pérez" />
            <Input label="Nombre contacto de compras" {...register('purchaseContactName')} placeholder="Ej: María García" />
            <Input label="Nombre secretaria / recepción" {...register('secretaryName')} placeholder="Ej: Lucía Ramírez" />
            <Input label="Otro contacto" {...register('otherContactName')} placeholder="Ej: Gerente técnico" />
          </CardContent>
        </Card>

        {/* Condiciones comerciales */}
        <Card>
          <CardHeader>
            <CardTitle>Condiciones comerciales</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Define el perfil comercial del cliente para calcular cupos, plazos y acceso al factoring.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium text-gray-700">Categoría *</span>
                <Hint text="Fundador Histórico: clientes de más de 10 años. Fundador Maral: clientes estratégicos actuales. Aliado: clientes recurrentes y confiables. Prospecto: clientes nuevos o potenciales." side="top" />
              </div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                {...register('category')}
              >
                <option value="IMPORTADOR">Importador (IM) — 36%</option>
                <option value="DISTRIBUIDOR">Distribuidor (DS) — 26%</option>
                <option value="CLIENTE_FINAL">Cliente Final (CF) — 10%</option>
                <option value="PROSPECTO">Prospecto</option>
                <option value="ALIADO">Aliado</option>
                <option value="FUNDADOR_HISTORICO">Fundador Histórico</option>
                <option value="FUNDADOR_MARAL">Fundador Maral</option>
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Frecuencia de compra</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                {...register('purchaseFrequency')}
              >
                <option value="NINGUNA">Sin historial</option>
                <option value="FRECUENTE">Frecuente (≥1 pedido/mes)</option>
                <option value="INTERMITENTE">Intermitente (cada 2-3 meses)</option>
                <option value="ESPORADICA">Esporádica (menos de 1 vez al año)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium text-gray-700">Estado Factoring</span>
                <Hint text="El factoring es cuando una entidad financiera le paga a Maral por adelantado las facturas del cliente." side="top" />
              </div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                {...register('factoringStatus')}
              >
                <option value="NO_APLICA">Sin Factoring</option>
                <option value="EN_ESTUDIO">En Estudio</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium text-gray-700">Cupo de crédito (COP) *</span>
                <Hint text="Monto máximo en pesos que este cliente puede comprar a crédito." side="top" />
              </div>
              <input
                type="number"
                min="0"
                step="100000"
                placeholder="Ej: 5000000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                {...register('creditLimit')}
              />
              {errors.creditLimit && <p className="text-xs text-red-500 mt-1">{errors.creditLimit.message}</p>}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium text-gray-700">Días de pago</span>
                <Hint text="Cuántos días calendario tiene el cliente para pagar después de recibir la factura." side="top" />
              </div>
              <input
                type="number"
                min="0"
                max="365"
                placeholder="Ej: 30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                {...register('paymentDays')}
              />
              {errors.paymentDays && <p className="text-xs text-red-500 mt-1">{errors.paymentDays.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Perfil de ventas */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil de ventas</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Información cualitativa para priorizar y personalizar el acercamiento comercial.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm font-medium text-gray-700">Tamaño del cliente (1-10)</span>
                  <Hint text="Asigna un número según qué tan grande consideras que es este cliente como empresa, independiente de lo que nos compre. Ej: Meltec = 9, una tienda pequeña = 2." side="top" />
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1 = pequeño · 10 = gigante"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                  {...register('companySizeScore')}
                />
                {errors.companySizeScore && <p className="text-xs text-red-500 mt-1">{errors.companySizeScore.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amigabilidad del cliente</label>
                <Controller
                  name="friendlinessLevel"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
                    >
                      <option value="">Sin definir</option>
                      <option value="poco">Poco amigable</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="mucho">Mucho</option>
                      <option value="muchísimo">Muchísimo</option>
                    </select>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                ¿Dónde normalmente compra? (competidores)
              </label>
              <Textarea
                placeholder="Ej: Le compra antenas a don Carlos, cable a Colombiatex, repetidoras a Meltec..."
                rows={3}
                {...register('competitors')}
              />
            </div>

            {/* Líneas de producto */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Líneas de producto que maneja</p>
              <div className="space-y-2">
                {PRODUCT_LINES_PREDEFINED.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!predefinedLines[key]}
                      onChange={(e) =>
                        setPredefinedLines((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
                {/* Custom lines */}
                {customLines.map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="rounded border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-700 flex-1">{line}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomLine(line)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {/* Add custom line */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newCustomLine}
                    onChange={(e) => setNewCustomLine(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomLine() } }}
                    placeholder="Otra línea (ej: CCTV, Internet Rural...)"
                    className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addCustomLine}>
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notas de llamadas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas de llamadas</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Registra temas importantes de cada llamada anteponiendo la fecha. Ej: "15 feb - solo trabajan con Motorola"</p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={"15 feb - nuestros ingresos vienen del alquiler de repetidoras\n03 mar - solo trabajan con productos Motorola\n20 mar - le compran antenas a don Carlos por el crédito"}
              rows={6}
              {...register('callNotes')}
            />
          </CardContent>
        </Card>

        {/* Notas internas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas internas generales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observaciones, historial, acuerdos especiales..."
              rows={4}
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending} leftIcon={<Save className="h-4 w-4" />}>
            {isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
