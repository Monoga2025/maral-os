import prisma from './prisma'

interface ScoreResult {
  score: number
  breakdown: {
    lifetimeValue: number
    recency: number
    frequency: number
    responseRate: number
    segmentWeight: number
    interestMatch: number
  }
}

export async function scoreClient(clientId: string, interestTags?: string[]): Promise<ScoreResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      segment: true,
      lifetimeValue: true,
      lastOrderAt: true,
      interestTags: true,
      orders: { select: { id: true } },
      campaignRecipients: {
        select: { repliedAt: true },
        where: { createdAt: { gte: new Date(Date.now() - 180 * 24 * 3600 * 1000) } },
      },
    },
  })

  const zero = { score: 0, breakdown: { lifetimeValue: 0, recency: 0, frequency: 0, responseRate: 0, segmentWeight: 0, interestMatch: 0 } }
  if (!client) return zero

  // lifetime value normalized (cap $50M COP)
  const ltv = Math.min(Number(client.lifetimeValue ?? 0) / 50_000_000, 1)

  // recency
  let recency = 0
  if (client.lastOrderAt) {
    const days = (Date.now() - client.lastOrderAt.getTime()) / 86_400_000
    recency = days <= 30 ? 1 : days <= 90 ? 0.7 : days <= 180 ? 0.5 : days <= 365 ? 0.3 : 0.1
  }

  // frequency (cap 20 orders)
  const frequency = Math.min(client.orders.length / 20, 1)

  // historical response rate
  const total = client.campaignRecipients.length
  const replied = client.campaignRecipients.filter((r) => r.repliedAt).length
  const responseRate = total > 0 ? replied / total : 0.05

  // segment weight
  const segWeight = client.segment === 'IM' ? 1.0 : client.segment === 'DS' ? 0.7 : client.segment === 'CF' ? 0.4 : 0.3

  // interest match
  const interestMatch =
    interestTags && interestTags.length > 0
      ? (client.interestTags || []).some((t) => interestTags.includes(t)) ? 1.0 : 0.2
      : 0.5

  const raw = ltv * 0.25 + recency * 0.20 + frequency * 0.20 + responseRate * 0.15 + segWeight * 0.10 + interestMatch * 0.10
  const score = Math.min(100, Math.round(raw * 100))

  return {
    score,
    breakdown: {
      lifetimeValue: Math.round(ltv * 100),
      recency: Math.round(recency * 100),
      frequency: Math.round(frequency * 100),
      responseRate: Math.round(responseRate * 100),
      segmentWeight: Math.round(segWeight * 100),
      interestMatch: Math.round(interestMatch * 100),
    },
  }
}

export async function scoreAudience(
  clientIds: string[],
  interestTags?: string[],
): Promise<{
  avg: number
  distribution: { probable: number; possible: number; long: number }
  suggestion: string
}> {
  if (clientIds.length === 0) return { avg: 0, distribution: { probable: 0, possible: 0, long: 0 }, suggestion: '' }

  // Sample up to 100 for performance
  const sample = clientIds.length > 100 ? clientIds.sort(() => Math.random() - 0.5).slice(0, 100) : clientIds
  const scores = await Promise.all(sample.map((id) => scoreClient(id, interestTags)))
  const values = scores.map((s) => s.score)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)

  const probableRatio = values.filter((s) => s >= 70).length / values.length
  const probable = Math.round(probableRatio * clientIds.length)
  const possibleRatio = values.filter((s) => s >= 40 && s < 70).length / values.length
  const possible = Math.round(possibleRatio * clientIds.length)
  const long = clientIds.length - probable - possible

  const expectedConversion = Math.round(probable * 0.18 + possible * 0.06)
  const suggestion =
    probable > 0
      ? `Si priorizas los ${probable} clientes con score >70, esperas ~${expectedConversion} conversiones`
      : avg < 40
      ? 'Audiencia fría — considera enriquecer segmentación'
      : 'Audiencia con potencial medio — buen momento para lanzar'

  return { avg, distribution: { probable, possible, long }, suggestion }
}
