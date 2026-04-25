import { getNextBatch, incrementMetric } from './campaign-queue'
import { renderVariables } from './campaign-vars'
import evolutionApi from './evolutionApi'
import prisma from './prisma'

let workerInterval: ReturnType<typeof setInterval> | null = null

// ── A/B variant selection ──────────────────────────────────────

function pickVariant(step: { variants?: unknown; content?: string | null }): string | null {
  const variants = step.variants as { id: string; content: string; weight?: number }[] | null
  if (!variants || variants.length < 2 || !step.content) return null
  // Weighted random selection
  const totalWeight = variants.reduce((s, v) => s + (v.weight ?? 1), 0)
  let rand = Math.random() * totalWeight
  for (const v of variants) {
    rand -= v.weight ?? 1
    if (rand <= 0) return v.content
  }
  return variants[variants.length - 1].content
}

async function updateVariantMetric(
  stepId: string,
  variantContent: string,
  field: 'sent' | 'replied' | 'converted',
): Promise<void> {
  const step = await prisma.campaignStep.findUnique({ where: { id: stepId }, select: { variants: true, variantMetric: true } })
  if (!step) return
  const variants = step.variants as { id: string; content: string }[] | null
  if (!variants) return
  const v = variants.find((x) => x.content === variantContent)
  if (!v) return

  const metric = (step.variantMetric as Record<string, Record<string, number>> | null) ?? {}
  if (!metric[v.id]) metric[v.id] = { sent: 0, replied: 0, converted: 0 }
  metric[v.id][field] = (metric[v.id][field] ?? 0) + 1

  await prisma.campaignStep.update({ where: { id: stepId }, data: { variantMetric: metric } })
}

// ── Auto-pause logic (T5.7) ────────────────────────────────────

async function checkAutoPause(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { metrics: true },
  })
  if (!campaign || campaign.status !== 'EN_CURSO') return

  const metrics = campaign.metrics
  if (!metrics || metrics.sent < 30) return

  // Need at least 1 hour since campaign started
  if (campaign.startedAt && Date.now() - campaign.startedAt.getTime() < 3_600_000) return

  const currentRate = metrics.replied / metrics.sent

  // Get historical baseline from completed campaigns
  const completed = await prisma.campaignMetric.findMany({
    where: {
      campaign: { status: 'COMPLETADA', id: { not: campaignId } },
      sent: { gte: 30 },
    },
    select: { sent: true, replied: true },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  })

  if (completed.length === 0) return

  const baseline = completed.reduce((s, m) => s + m.replied / Math.max(m.sent, 1), 0) / completed.length
  if (baseline === 0) return

  // Auto-pause if current rate is >50% below baseline
  if (currentRate < baseline * 0.5) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSADA' } })

    const expectedPct = Math.round(baseline * 100)
    const actualPct = Math.round(currentRate * 100)

    await prisma.notification.create({
      data: {
        type: 'AUTO_PAUSE',
        title: `⏸️ Campaña pausada automáticamente`,
        body: `Respuesta: ${actualPct}% vs ${expectedPct}% esperado. Ajusta el copy y reanuda manualmente.`,
        meta: { campaignId, currentRate: actualPct, baseline: expectedPct } as any,
      },
    })

    const phone = process.env.HOT_LEAD_NOTIFY_PHONE
    if (phone) {
      const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } })
      evolutionApi
        .sendTextMessage(
          phone,
          `⏸️ *Campaña pausada automáticamente*\n*Campaña:* ${c?.name}\n*Respuesta actual:* ${actualPct}%\n*Esperado:* ${expectedPct}%\n\nAjusta el copy y reanuda desde MARAL OS.`,
        )
        .catch(() => {})
    }

    console.log(`[campaign-sender] Auto-paused campaign ${campaignId} — ${actualPct}% vs ${expectedPct}% baseline`)
  }
}

// ── Main tick ──────────────────────────────────────────────────

async function tick() {
  let batch: Awaited<ReturnType<typeof getNextBatch>>
  try {
    batch = await getNextBatch(5)
  } catch (err) {
    console.error('[campaign-sender] getNextBatch error:', err)
    return
  }

  const campaignsSeen = new Set<string>()

  for (const recipient of batch) {
    const { campaign, client } = recipient
    const steps = campaign.steps
    const stepIndex = recipient.currentStep

    try {
      if (stepIndex >= steps.length) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        })
        await incrementMetric(campaign.id, 'delivered')
        continue
      }

      const step = steps[stepIndex]
      const phone = client.whatsapp!

      // A/B variant selection for TEXT steps
      const abVariant = step.type === 'TEXT' ? pickVariant(step) : null
      const textContent = abVariant ?? (step.content ?? '')

      if (step.type === 'TEXT' && textContent) {
        await evolutionApi.sendTextMessage(phone, renderVariables(textContent, client as any))
        if (abVariant) await updateVariantMetric(step.id, abVariant, 'sent').catch(() => {})
      } else if (step.mediaUrl) {
        const caption = step.content ? renderVariables(step.content, client as any) : undefined
        await (evolutionApi as any).sendMedia(
          phone,
          step.type,
          step.mediaUrl,
          caption,
          step.fileName ?? undefined,
        )
      }

      const nextStep = stepIndex + 1
      const hasMore = nextStep < steps.length
      const nextScheduledAt = hasMore ? new Date(Date.now() + steps[nextStep].delaySeconds * 1000) : null

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          currentStep: nextStep,
          status: hasMore ? 'SCHEDULED' : 'SENT',
          sentAt: recipient.sentAt ?? new Date(),
          scheduledAt: nextScheduledAt,
        },
      })

      if (!hasMore) {
        await incrementMetric(campaign.id, 'sent')
        campaignsSeen.add(campaign.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'FAILED', lastError: msg.slice(0, 500) },
      })
    }
  }

  // Check auto-pause once per tick per campaign
  for (const campaignId of campaignsSeen) {
    checkAutoPause(campaignId).catch(() => {})
  }
}

export function startSender() {
  if (workerInterval) return
  workerInterval = setInterval(tick, 5000)
  console.log('[campaign-sender] Worker started — polling every 5s')
}

export function stopSender() {
  if (workerInterval) clearInterval(workerInterval)
  workerInterval = null
}
