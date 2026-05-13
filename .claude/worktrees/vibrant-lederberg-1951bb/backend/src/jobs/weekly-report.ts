import prisma from '../lib/prisma'
import { evolutionApi } from '../lib/evolutionApi'

async function buildReport(): Promise<string> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000)

  const [campaigns, unattendedHot] = await Promise.all([
    prisma.campaign.findMany({
      where: { createdAt: { gte: since } },
      include: { metrics: true },
    }),
    prisma.campaignRecipient.findMany({
      where: {
        temperature: 'HOT',
        repliedAt: { gte: since },
        convertedAt: null,
      },
      include: { client: { select: { name: true } } },
      take: 5,
    }),
  ])

  const sent = campaigns.reduce((s, c) => s + (c.metrics?.sent ?? 0), 0)
  const replied = campaigns.reduce((s, c) => s + (c.metrics?.replied ?? 0), 0)
  const converted = campaigns.reduce((s, c) => s + (c.metrics?.converted ?? 0), 0)
  const revenue = campaigns.reduce((s, c) => s + Number(c.metrics?.revenueCOP ?? 0), 0)
  const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 0

  // Best campaign by response rate
  let topCampaign: (typeof campaigns)[0] | null = null
  let topRate = 0
  for (const c of campaigns) {
    if (!c.metrics || c.metrics.sent === 0) continue
    const r = c.metrics.replied / c.metrics.sent
    if (r > topRate) { topRate = r; topCampaign = c }
  }

  const revenueStr = revenue > 0 ? `$${(revenue / 1_000_000).toFixed(1)}M COP` : '$0'

  const topLine = topCampaign
    ? `\n\n🏆 *Campaña top:* ${topCampaign.name}\n   Response rate: ${Math.round(topRate * 100)}%\n   Revenue: ${Number(topCampaign.metrics?.revenueCOP ?? 0) > 0 ? '$' + (Number(topCampaign.metrics!.revenueCOP) / 1_000_000).toFixed(1) + 'M' : 'pendiente'}`
    : ''

  const warnLine = unattendedHot.length > 0
    ? `\n\n⚠️ *Atención:*\n   ${unattendedHot.length} leads HOT sin convertir:\n${unattendedHot.map((r) => `   • ${r.client.name}`).join('\n')}`
    : ''

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'

  return [
    '📊 *MARAL — Resumen semanal*',
    '',
    `Campañas: ${campaigns.length}`,
    `Mensajes enviados: ${sent}`,
    `Tasa de respuesta: ${responseRate}%`,
    `Leads respondidos: ${replied}`,
    `Conversiones: ${converted}`,
    `Revenue: ${revenueStr}`,
    topLine,
    warnLine,
    '',
    `📈 ${appUrl}/reportes/campanas`,
  ]
    .filter((l) => l !== '')
    .join('\n')
}

export async function sendWeeklyReport(): Promise<void> {
  const phone = process.env.HOT_LEAD_NOTIFY_PHONE
  if (!phone) {
    console.log('[weekly-report] HOT_LEAD_NOTIFY_PHONE not set — skipping')
    return
  }
  try {
    const msg = await buildReport()
    await evolutionApi.sendTextMessage(phone, msg)
    console.log('[weekly-report] Sent to', phone)
  } catch (err) {
    console.error('[weekly-report] Error:', err)
  }
}

export function startWeeklyReportJob(): void {
  let lastRunWeek = -1
  setInterval(() => {
    // Sunday 7pm Bogotá = Sunday 00:00 UTC (next day)
    const now = new Date()
    const bogota = new Date(now.getTime() - 5 * 3_600_000)
    const week = Math.floor(bogota.getTime() / (7 * 24 * 3_600_000))
    if (bogota.getUTCDay() === 0 && bogota.getUTCHours() === 19 && week !== lastRunWeek) {
      lastRunWeek = week
      sendWeeklyReport().catch(console.error)
    }
  }, 3_600_000)
  console.log('[weekly-report] Job scheduled — Sundays 7pm Bogotá')
}
