import prisma from './prisma'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

async function calcBestTimeForClient(clientId: string): Promise<void> {
  const since = new Date(Date.now() - 90 * 24 * 86_400_000)
  const replies = await prisma.campaignRecipient.findMany({
    where: { clientId, repliedAt: { gte: since }, NOT: { repliedAt: null } },
    select: { repliedAt: true, sentAt: true },
  })

  if (replies.length < 3) return

  const hourCounts: Record<number, number> = {}
  const dayCounts: Record<string, number> = {}
  let totalResponseMs = 0
  let responseCount = 0

  for (const r of replies) {
    if (!r.repliedAt) continue
    // Bogotá = UTC-5
    const bogotaD = new Date(r.repliedAt.getTime() - 5 * 3_600_000)
    const hour = bogotaD.getUTCHours()
    const day = DAYS[bogotaD.getUTCDay()]
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
    dayCounts[day] = (dayCounts[day] ?? 0) + 1
    if (r.sentAt) {
      totalResponseMs += r.repliedAt.getTime() - r.sentAt.getTime()
      responseCount++
    }
  }

  const bestHours = Object.entries(hourCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([h]) => parseInt(h))

  const bestDays = Object.entries(dayCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([d]) => d)

  const avgResponseTimeSeconds = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 1000) : null

  await prisma.client.update({
    where: { id: clientId },
    data: {
      bestContactWindow: {
        bestHours,
        bestDays,
        avgResponseTimeSeconds,
        samples: replies.length,
        updatedAt: new Date().toISOString(),
      },
    },
  })
}

export async function runBestTimeJob(): Promise<void> {
  const rows = await prisma.campaignRecipient.findMany({
    distinct: ['clientId'],
    select: { clientId: true },
    where: { repliedAt: { not: null } },
  })
  console.log(`[best-time] Updating ${rows.length} clients...`)
  for (const { clientId } of rows) {
    try {
      await calcBestTimeForClient(clientId)
    } catch (err) {
      console.error(`[best-time] Error client ${clientId}:`, err)
    }
  }
  console.log('[best-time] Done')
}

export function startBestTimeJob(): void {
  // Schedule for 5am UTC = midnight Bogotá
  const scheduleNext = () => {
    const now = Date.now()
    const next = new Date(now)
    next.setUTCHours(5, 0, 0, 0)
    if (next.getTime() <= now) next.setUTCDate(next.getUTCDate() + 1)
    setTimeout(() => {
      runBestTimeJob().catch(console.error)
      setInterval(() => runBestTimeJob().catch(console.error), 24 * 3_600_000)
    }, next.getTime() - now)
  }
  scheduleNext()
  console.log('[best-time] Nightly job scheduled — midnight Bogotá')
}
