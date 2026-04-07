import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
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
  category: z.enum(['FUNDADOR_HISTORICO', 'FUNDADOR_MARAL', 'ALIADO', 'PROSPECTO']),
  creditLimit: z.coerce.number().min(0),
  paymentDays: z.coerce.number().min(0),
  factoringStatus: z.enum(['APROBADO', 'EN_ESTUDIO', 'RECHAZADO', 'NO_APLICA']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ClientForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id!).then((r) => r.data),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'PROSPECTO',
      factoringStatus: 'NO_APLICA',
      creditLimit: 0,
      paymentDays: 30,
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
        notes: client.notes ?? '',
      })
    }
  }, [client, reset])

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEditing
        ? clientsApi.update(id!, data)
        : clientsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(
        isEditing ? 'Cliente actualizado' : 'Cliente creado exitosamente'
      )
      navigate(`/clientes/${res.data.id}`)
    },
    onError: () => {
      toast.error('Error al guardar el cliente')
    },
  })

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
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre completo *"
              {...register('name')}
              error={errors.name?.message}
            />
            <Input
              label="Empresa"
              {...register('company')}
              error={errors.company?.message}
            />
            <Input
              label="RUT / NIT"
              {...register('rut')}
              placeholder="900.123.456-7"
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Teléfono"
              {...register('phone')}
              placeholder="3001234567"
            />
            <Input
              label="WhatsApp"
              {...register('whatsapp')}
              placeholder="3001234567"
            />
            <Input
              label="Ciudad"
              placeholder="Ej: Bogotá"
              {...register('city')}
            />
            <Input
              label="Dirección"
              placeholder="Ej: Calle 45 # 23-12"
              {...register('address')}
            />
          </CardContent>
        </Card>

        {/* Commercial conditions */}
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
                <option value="FUNDADOR_HISTORICO">Fundador Histórico</option>
                <option value="FUNDADOR_MARAL">Fundador Maral</option>
                <option value="ALIADO">Aliado</option>
                <option value="PROSPECTO">Prospecto</option>
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium text-gray-700">Estado Factoring</span>
                <Hint text="El factoring es cuando una entidad financiera le paga a Maral por adelantado las facturas del cliente. Clientes aprobados: Meltec, ISEC, Eleinco. Si no aplica, dejar en 'Sin Factoring'." side="top" />
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
                <Hint text="Monto máximo en pesos que este cliente puede comprar a crédito. Ej: $5.000.000 para clientes nuevos, $20.000.000 para fundadores." side="top" />
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
                <Hint text="Cuántos días calendario tiene el cliente para pagar después de recibir la factura. Valores comunes: 30, 45, 60 o 90 días." side="top" />
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

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notas internas</CardTitle>
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
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate('/clientes')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
