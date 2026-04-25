import prisma from './prisma'
import { CustomerSegment } from '@prisma/client'

export interface AudienceFilter {
  segments?: CustomerSegment[]
  cities?: string[]
  interestTags?: string[]
  hasOrderedInLastMonths?: number | null
  hasNotOrderedInLastMonths?: number | null
  minLifetimeValue?: number
  excludeActiveQuotations?: boolean
  excludeActiveOrders?: boolean
  excludeOptedOut?: boolean
  excludeRecentCampaign?: number
}

export async function resolveAudience(filters: AudienceFilter) {
  const {
    segments,
    cities,
    interestTags,
    hasOrderedInLastMonths,
    hasNotOrderedInLastMonths,
    minLifetimeValue,
    excludeActiveQuotations = false,
    excludeActiveOrders = false,
    excludeOptedOut = true,
    excludeRecentCampaign,
  } = filters

  const now = new Date()
  const AND: Record<string, unknown>[] = [{ whatsapp: { not: null } }]

  if (excludeOptedOut) AND.push({ optedOut: false })

  if (segments && segments.length > 0) AND.push({ segment: { in: segments } })

  if (cities && cities.length > 0) AND.push({ city: { in: cities } })

  if (interestTags && interestTags.length > 0) AND.push({ interestTags: { hasSome: interestTags } })

  if (hasOrderedInLastMonths != null) {
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - hasOrderedInLastMonths)
    AND.push({ lastOrderAt: { gte: cutoff } })
  } else if (hasNotOrderedInLastMonths != null) {
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - hasNotOrderedInLastMonths)
    AND.push({ OR: [{ lastOrderAt: { lt: cutoff } }, { lastOrderAt: null }] })
  }

  if (minLifetimeValue !== undefined) AND.push({ lifetimeValue: { gte: minLifetimeValue } })

  if (excludeActiveQuotations) {
    AND.push({ quotations: { none: { status: { in: ['BORRADOR', 'ENVIADA', 'APROBADA'] } } } })
  }

  if (excludeActiveOrders) {
    AND.push({ orders: { none: { status: { notIn: ['ENTREGADO', 'CANCELADO'] } } } })
  }

  if (excludeRecentCampaign !== undefined) {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - excludeRecentCampaign)
    AND.push({
      campaignRecipients: {
        none: { createdAt: { gte: cutoff }, status: { notIn: ['EXCLUDED', 'FAILED'] } },
      },
    })
  }

  return prisma.client.findMany({
    where: { AND },
    select: {
      id: true,
      name: true,
      whatsapp: true,
      city: true,
      segment: true,
      interestTags: true,
      lastOrderAt: true,
    },
    orderBy: { name: 'asc' },
  })
}
