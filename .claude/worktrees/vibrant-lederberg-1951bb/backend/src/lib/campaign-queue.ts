import prisma from './prisma'
import { isQuietHour } from './pacing'

export async function getNextBatch(limit = 5) {
  if (isQuietHour()) return []

  return prisma.campaignRecipient.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
      campaign: { status: 'EN_CURSO' },
    },
    include: {
      campaign: { include: { steps: { orderBy: { order: 'asc' } } } },
      client: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  })
}

export async function incrementMetric(
  campaignId: string,
  field: 'sent' | 'delivered' | 'read' | 'replied' | 'converted',
) {
  await prisma.campaignMetric.upsert({
    where: { campaignId },
    create: { campaignId, [field]: 1 },
    update: { [field]: { increment: 1 } },
  })
}
