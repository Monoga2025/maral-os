import prisma from './prisma'

interface PatternResult {
  phrase: string
  usageCount: number
  avgResponseRate: number
  campaigns: string[]
}

export async function analyzeForbiddenPatterns(): Promise<PatternResult[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'COMPLETADA' },
    include: {
      steps: { where: { type: 'TEXT' } },
      metrics: true,
      _count: { select: { recipients: true } },
    },
  })

  // Only low performers with enough data
  const lowPerformers = campaigns.filter((c) => {
    if (!c.metrics || c._count.recipients < 20) return false
    return c.metrics.replied / Math.max(c.metrics.sent, 1) < 0.05
  })

  if (lowPerformers.length === 0) return []

  const phraseMap: Record<string, { count: number; campaigns: Set<string>; rates: number[] }> = {}

  for (const campaign of lowPerformers) {
    const rate = campaign.metrics!.replied / Math.max(campaign.metrics!.sent, 1)
    for (const step of campaign.steps) {
      if (!step.content) continue
      const words = step.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ')
        if (!phraseMap[phrase]) phraseMap[phrase] = { count: 0, campaigns: new Set(), rates: [] }
        phraseMap[phrase].count++
        phraseMap[phrase].campaigns.add(campaign.name)
        phraseMap[phrase].rates.push(rate)
      }
    }
  }

  return Object.entries(phraseMap)
    .filter(([_, v]) => v.count >= 2)
    .map(([phrase, v]) => ({
      phrase,
      usageCount: v.count,
      avgResponseRate: Math.round((v.rates.reduce((a, b) => a + b, 0) / v.rates.length) * 100),
      campaigns: Array.from(v.campaigns),
    }))
    .sort((a, b) => a.avgResponseRate - b.avgResponseRate)
    .slice(0, 20)
}

export async function runMonthlyPatternAnalysis(): Promise<void> {
  console.log('[forbidden-patterns] Running monthly analysis...')
  const patterns = await analyzeForbiddenPatterns()
  if (patterns.length === 0) {
    console.log('[forbidden-patterns] Not enough data yet')
    return
  }

  const lines = patterns
    .slice(0, 10)
    .map((p) => `"${p.phrase}" — ${p.avgResponseRate}% respuesta`)
    .join('\n')

  await prisma.notification.create({
    data: {
      type: 'PATTERN_ANALYSIS',
      title: '⚠️ Frases con bajo rendimiento detectadas',
      body: `Análisis mensual — ${patterns.length} patrones <5% respuesta:\n\n${lines}`,
      meta: { patterns: patterns.slice(0, 10) } as any,
    },
  })

  console.log('[forbidden-patterns] Notification created')
}

export function startPatternJob(): void {
  // Check hourly; run first Sunday of month at 8am Bogotá (13 UTC)
  let lastRunMonth = -1
  setInterval(() => {
    const now = new Date()
    const bogota = new Date(now.getTime() - 5 * 3_600_000)
    const month = bogota.getUTCMonth()
    if (bogota.getUTCDay() === 0 && bogota.getUTCHours() === 13 && bogota.getUTCDate() <= 7 && month !== lastRunMonth) {
      lastRunMonth = month
      runMonthlyPatternAnalysis().catch(console.error)
    }
  }, 3_600_000)
  console.log('[forbidden-patterns] Monthly pattern job scheduled')
}
