import { Client, CustomerSegment } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const SEGMENT_DISCOUNT: Record<CustomerSegment, string> = {
  IM: '36%',
  DS: '26%',
  CF: '10%',
}

/** Reemplaza todas las variables {variable} en un template con datos reales del cliente. */
export function renderVariables(
  template: string,
  client: Client & { assignedSellerName?: string }
): string {
  const firstName = (client.name || '').split(' ')[0]

  const lastOrderText = client.lastOrderAt
    ? formatDistanceToNow(new Date(client.lastOrderAt), { addSuffix: true, locale: es })
    : 'hace mucho tiempo'

  const discount = client.segment ? SEGMENT_DISCOUNT[client.segment] : null

  return template
    .replace(/\{nombre\}/gi, client.name || '')
    .replace(/\{primerNombre\}/gi, firstName)
    .replace(/\{ciudad\}/gi, client.city || '')
    .replace(/\{ultimaCompra\}/gi, lastOrderText)
    .replace(/\{descuentoCategoria\}/gi, discount ?? 'consultar descuento')
    .replace(/\{vendedor\}/gi, client.assignedSellerName || 'nuestro equipo')
    .replace(/\{segmento\}/gi, client.segment ?? '')
}

/** Extrae los nombres de las variables usadas en un template. */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) || []
  const all = matches.map(m => m.slice(1, -1))
  return all.filter((v, i) => all.indexOf(v) === i)
}

/** Valida que todas las variables del template sean conocidas. */
export const KNOWN_VARIABLES = [
  'nombre',
  'primerNombre',
  'ciudad',
  'ultimaCompra',
  'descuentoCategoria',
  'vendedor',
  'segmento',
]

export function validateVariables(template: string): { valid: boolean; unknown: string[] } {
  const used = extractVariables(template)
  const unknown = used.filter(v => !KNOWN_VARIABLES.includes(v.toLowerCase()))
  return { valid: unknown.length === 0, unknown }
}
