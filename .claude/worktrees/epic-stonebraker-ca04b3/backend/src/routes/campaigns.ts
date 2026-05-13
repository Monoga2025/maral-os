import { Router, Response } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import prisma from '../lib/prisma'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { resolveAudience } from '../lib/audience-query'
import { scheduleRecipients } from '../lib/pacing'
import { renderVariables } from '../lib/campaign-vars'
import { scoreAudience } from '../lib/purchase-predictor'

const router = Router()
router.use(authenticate)

// ── Image upload ────────────────────────────────────────────────

const CAMPAIGN_UPLOAD_DIR = path.join(process.env.UPLOAD_DIR || './uploads', 'campaigns')
if (!fs.existsSync(CAMPAIGN_UPLOAD_DIR)) fs.mkdirSync(CAMPAIGN_UPLOAD_DIR, { recursive: true })

const campaignImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CAMPAIGN_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true)
    else cb(new Error('Solo imágenes y videos'))
  },
})

// POST /api/campaigns/upload-image
router.post('/upload-image', requireRole('GERENTE', 'VENTAS'), campaignImageUpload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió archivo' }); return }
  const url = `/uploads/campaigns/${req.file.filename}`
  res.json({ url, name: req.file.originalname, size: req.file.size })
})

// ── Schemas ────────────────────────────────────────────────────

const campaignSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  objective: z.string().optional(),
})

const stepSchema = z.object({
  order: z.number().int().min(0),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  delaySeconds: z.number().int().min(0).default(10),
})

const audienceBodySchema = z.object({
  filters: z.object({
    segments: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    interestTags: z.array(z.string()).optional(),
    hasOrderedInLastMonths: z.number().nullable().optional(),
    hasNotOrderedInLastMonths: z.number().nullable().optional(),
    minLifetimeValue: z.number().optional(),
    excludeActiveQuotations: z.boolean().optional(),
    excludeActiveOrders: z.boolean().optional(),
    excludeOptedOut: z.boolean().optional(),
    excludeRecentCampaign: z.number().optional(),
  }),
})

// ── Shared include ─────────────────────────────────────────────

const BASE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  steps: { orderBy: { order: 'asc' } as const },
  metrics: true,
  _count: { select: { recipients: true } },
} as const

// ── GET /api/campaigns ─────────────────────────────────────────

router.get('/', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: BASE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    res.json(campaigns)
  } catch {
    res.status(500).json({ error: 'Error al obtener campañas' })
  }
})

// ── GET /api/campaigns/experiments ───────────────────────────── (T5.8)

import { getExperiments, CANDIDATE_EXPERIMENTS, startExperiment, completeExperiment } from '../lib/experiment-registry'

router.get('/experiments', requireRole('GERENTE', 'VENTAS'), (_req, res) => {
  res.json({ experiments: getExperiments(), candidates: CANDIDATE_EXPERIMENTS })
})

router.post('/experiments', requireRole('GERENTE'), (req: AuthRequest, res: Response) => {
  try {
    const { name, hypothesis, metric, cohorts } = req.body
    if (!name || !hypothesis || !metric || !cohorts?.length) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }
    const exp = startExperiment({ name, hypothesis, metric, cohorts })
    res.status(201).json(exp)
  } catch {
    res.status(500).json({ error: 'Error al crear experimento' })
  }
})

router.put('/experiments/:id/complete', requireRole('GERENTE'), (req: AuthRequest, res: Response) => {
  try {
    const { results, winner, conclusion } = req.body
    completeExperiment(req.params.id, results, winner, conclusion)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al completar experimento' })
  }
})

// ── POST /api/campaigns/analyze-photo ────────────────────────
// Analiza foto de producto → extrae descripción para alimentar a Marco

import { generateCampaignWithMarco, analyzeProductPhoto, type MarcoRequest } from '../lib/marco'
import { generateCampaignImage } from '../lib/image-gen'

router.post('/analyze-photo', requireRole('GERENTE', 'VENTAS'), async (_req: AuthRequest, res: Response) => {
  try {
    const { imageUrl } = z.object({ imageUrl: z.string().url() }).parse(_req.body)
    const analysis = await analyzeProductPhoto(imageUrl)
    res.json(analysis)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    const msg = err instanceof Error ? err.message : 'Error analizando foto'
    res.status(500).json({ error: msg })
  }
})

// ── POST /api/campaigns/:id/reset ─────────────────────────────

router.post('/:id/reset', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'EN_CURSO') {
      return res.status(400).json({ error: 'Solo campañas EN_CURSO pueden resetearse' })
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'BORRADOR' },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Error al resetear campaña' })
  }
})

// ── GET /api/campaigns/:id ─────────────────────────────────────

router.get('/:id', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        ...BASE_INCLUDE,
        recipients: {
          include: { client: { select: { id: true, name: true, whatsapp: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    res.json(campaign)
  } catch {
    res.status(500).json({ error: 'Error al obtener campaña' })
  }
})

// ── POST /api/campaigns ────────────────────────────────────────

router.post('/', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const body = campaignSchema.parse(req.body)
    const campaign = await prisma.campaign.create({
      data: { ...body, createdById: req.user!.userId },
      include: BASE_INCLUDE,
    })
    await prisma.campaignMetric.create({ data: { campaignId: campaign.id } })
    res.status(201).json(campaign)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Error al crear campaña' })
  }
})

// ── PUT /api/campaigns/:id ─────────────────────────────────────

router.put('/:id', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (existing.status !== 'BORRADOR') {
      return res.status(400).json({ error: 'Solo se pueden editar campañas en BORRADOR' })
    }
    const body = campaignSchema.partial().parse(req.body)
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: body,
      include: BASE_INCLUDE,
    })
    res.json(campaign)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Error al actualizar campaña' })
  }
})

// ── DELETE /api/campaigns/:id ──────────────────────────────────

router.delete('/:id', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (existing.status !== 'BORRADOR') {
      return res.status(400).json({ error: 'Solo se pueden eliminar campañas en BORRADOR' })
    }
    await prisma.campaign.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al eliminar campaña' })
  }
})

// ── POST /api/campaigns/:id/steps ─────────────────────────────

router.post('/:id/steps', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'BORRADOR') return res.status(400).json({ error: 'Solo se pueden agregar pasos en BORRADOR' })

    const body = stepSchema.parse(req.body)
    const step = await prisma.campaignStep.create({ data: { campaignId: req.params.id, ...body } })
    res.status(201).json(step)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Error al crear paso' })
  }
})

// ── PUT /api/campaigns/:id/steps/:stepId ──────────────────────

router.put('/:id/steps/:stepId', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'BORRADOR') return res.status(400).json({ error: 'Solo en BORRADOR' })

    const body = stepSchema.partial().parse(req.body)
    const step = await prisma.campaignStep.update({ where: { id: req.params.stepId }, data: body })
    res.json(step)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Error al actualizar paso' })
  }
})

// ── DELETE /api/campaigns/:id/steps/:stepId ───────────────────

router.delete('/:id/steps/:stepId', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'BORRADOR') return res.status(400).json({ error: 'Solo en BORRADOR' })

    await prisma.campaignStep.delete({ where: { id: req.params.stepId } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al eliminar paso' })
  }
})

// ── POST /api/campaigns/:id/reorder-steps ─────────────────────

router.post('/:id/reorder-steps', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const { stepIds } = z.object({ stepIds: z.array(z.string()) }).parse(req.body)
    await Promise.all(
      stepIds.map((stepId, index) =>
        prisma.campaignStep.update({ where: { id: stepId }, data: { order: index } }),
      ),
    )
    const steps = await prisma.campaignStep.findMany({
      where: { campaignId: req.params.id },
      orderBy: { order: 'asc' },
    })
    res.json(steps)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Error al reordenar pasos' })
  }
})

// ── POST /api/campaigns/:id/audience ──────────────────────────

router.post('/:id/audience', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const { filters } = audienceBodySchema.parse(req.body)
    const clients = await resolveAudience(filters as any)

    // Deduplication: exclude clients in other active campaigns
    const activeCampaignIds = (
      await prisma.campaign.findMany({
        where: { id: { not: req.params.id }, status: { in: ['EN_CURSO', 'PAUSADA'] } },
        select: { id: true },
      })
    ).map((c) => c.id)

    let eligibleIds = clients.map((c) => c.id)
    let excluded = 0

    if (activeCampaignIds.length > 0) {
      const busy = new Set(
        (
          await prisma.campaignRecipient.findMany({
            where: {
              campaignId: { in: activeCampaignIds },
              clientId: { in: eligibleIds },
              status: { notIn: ['EXCLUDED', 'FAILED'] },
            },
            select: { clientId: true },
          })
        ).map((r) => r.clientId),
      )
      excluded = busy.size
      eligibleIds = eligibleIds.filter((id) => !busy.has(id))
    }

    // Replace pending recipients
    await prisma.campaignRecipient.deleteMany({
      where: { campaignId: req.params.id, status: 'PENDING' },
    })
    if (eligibleIds.length > 0) {
      await prisma.campaignRecipient.createMany({
        data: eligibleIds.map((clientId) => ({
          campaignId: req.params.id,
          clientId,
          status: 'PENDING' as const,
        })),
        skipDuplicates: true,
      })
    }
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { audienceFilter: filters as any },
    })

    // Lead scoring (T5.3) — async, non-blocking for response
    const interestTags = (filters as any).interestTags as string[] | undefined
    const scorePromise = scoreAudience(eligibleIds, interestTags)

    // Historical baseline for prediction (T5.4)
    const historicalMetrics = await prisma.campaignMetric.findMany({
      where: { campaign: { status: 'COMPLETADA' }, sent: { gte: 30 } },
      select: { sent: true, replied: true, converted: true, revenueCOP: true },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    })

    const [audienceScore] = await Promise.all([scorePromise])

    let prediction: {
      responseRate: string
      expectedConversions: string
      estimatedRevenue: string
      confidence: 'low' | 'medium' | 'high'
    } | null = null

    if (historicalMetrics.length >= 3) {
      const avgRepliedRate = historicalMetrics.reduce((s, m) => s + m.replied / Math.max(m.sent, 1), 0) / historicalMetrics.length
      const avgConvRate = historicalMetrics.reduce((s, m) => s + m.converted / Math.max(m.replied, 1), 0) / historicalMetrics.length
      const avgRevenuePerConv = historicalMetrics.reduce((s, m) => s + Number(m.revenueCOP) / Math.max(m.converted, 1), 0) / historicalMetrics.filter((m) => m.converted > 0).length || 0

      // Adjust rates by audience score
      const scoreFactor = audienceScore.avg / 50 // 1.0 at avg score 50
      const adjReply = Math.min(avgRepliedRate * scoreFactor, 0.99)
      const loReply = Math.round(adjReply * 0.8 * 100)
      const hiReply = Math.round(Math.min(adjReply * 1.2, 0.99) * 100)

      const expConvLo = Math.round(eligibleIds.length * adjReply * 0.8 * avgConvRate)
      const expConvHi = Math.round(eligibleIds.length * adjReply * 1.2 * avgConvRate)
      const estRevLo = Math.round(expConvLo * avgRevenuePerConv / 1_000_000)
      const estRevHi = Math.round(expConvHi * avgRevenuePerConv / 1_000_000)

      prediction = {
        responseRate: `${loReply}-${hiReply}%`,
        expectedConversions: `${expConvLo}-${expConvHi}`,
        estimatedRevenue: avgRevenuePerConv > 0 ? `$${estRevLo}M - $${estRevHi}M COP` : 'Sin datos',
        confidence: historicalMetrics.length >= 10 ? 'high' : historicalMetrics.length >= 5 ? 'medium' : 'low',
      }
    }

    res.json({
      total: eligibleIds.length,
      excluded,
      sample: clients.slice(0, 10).map((c) => ({ id: c.id, name: c.name, city: c.city })),
      score: audienceScore,
      prediction,
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    console.error('[campaigns] audience error:', err)
    res.status(500).json({ error: 'Error al calcular audiencia' })
  }
})

// ── GET /api/campaigns/:id/preview/:clientId ──────────────────

router.get('/:id/preview/:clientId', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const [campaign, client] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: { steps: { orderBy: { order: 'asc' } } },
      }),
      prisma.client.findUnique({ where: { id: req.params.clientId } }),
    ])
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })

    const steps = campaign.steps.map((step) => ({
      ...step,
      renderedContent: step.content ? renderVariables(step.content, client as any) : null,
    }))
    res.json({ steps, client: { id: client.id, name: client.name } })
  } catch {
    res.status(500).json({ error: 'Error al generar preview' })
  }
})

// ── POST /api/campaigns/:id/launch ────────────────────────────

router.post('/:id/launch', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const evolutionUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_URL;
    if (!evolutionUrl) {
      return res.status(503).json({
        error: 'Servicio de WhatsApp no configurado. Configure EVOLUTION_API_URL.',
      });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        steps: true,
        recipients: { where: { status: 'PENDING' } },
      },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (!['BORRADOR', 'LISTA'].includes(campaign.status)) {
      return res.status(400).json({ error: `No se puede lanzar desde estado ${campaign.status}` })
    }
    if (campaign.steps.length === 0) return res.status(400).json({ error: 'La campaña no tiene pasos' })
    if (campaign.recipients.length === 0) return res.status(400).json({ error: 'La campaña no tiene destinatarios. Calcula la audiencia primero.' })

    const dates = scheduleRecipients(campaign.recipients.length)
    await Promise.all(
      campaign.recipients.map((r, i) =>
        prisma.campaignRecipient.update({
          where: { id: r.id },
          data: { status: 'SCHEDULED', scheduledAt: dates[i] },
        }),
      ),
    )
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'EN_CURSO', startedAt: new Date() },
    })
    res.json({ ok: true, scheduled: campaign.recipients.length })
  } catch (err) {
    console.error('[campaigns] launch error:', err)
    res.status(500).json({ error: 'Error al lanzar campaña' })
  }
})

// ── POST /api/campaigns/:id/pause ─────────────────────────────

router.post('/:id/pause', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'EN_CURSO') return res.status(400).json({ error: 'La campaña no está en curso' })

    await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'PAUSADA' } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al pausar' })
  }
})

// ── POST /api/campaigns/:id/resume ────────────────────────────

router.post('/:id/resume', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'PAUSADA') return res.status(400).json({ error: 'La campaña no está pausada' })

    await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'EN_CURSO' } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al reanudar' })
  }
})

// ── POST /api/campaigns/:id/cancel ────────────────────────────

router.post('/:id/cancel', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (['COMPLETADA', 'CANCELADA'].includes(campaign.status)) {
      return res.status(400).json({ error: 'La campaña ya está finalizada' })
    }
    await prisma.campaignRecipient.updateMany({
      where: { campaignId: req.params.id, status: { in: ['PENDING', 'SCHEDULED'] } },
      data: { status: 'EXCLUDED' },
    })
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'CANCELADA', completedAt: new Date() },
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al cancelar' })
  }
})

// ── GET /api/campaigns/:id/live ───────────────────────────────

router.get('/:id/live', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const [campaign, metrics, countsByStatus, recentRecipients] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: req.params.id },
        select: { id: true, name: true, status: true, startedAt: true, completedAt: true },
      }),
      prisma.campaignMetric.findUnique({ where: { campaignId: req.params.id } }),
      prisma.campaignRecipient.groupBy({
        by: ['status'],
        where: { campaignId: req.params.id },
        _count: true,
      }),
      prisma.campaignRecipient.findMany({
        where: { campaignId: req.params.id, sentAt: { not: null } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { sentAt: 'desc' },
        take: 20,
      }),
    ])

    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    res.json({ campaign, metrics, countsByStatus, recentRecipients })
  } catch {
    res.status(500).json({ error: 'Error al obtener estado en vivo' })
  }
})

// ── POST /api/campaigns/:id/marco ─────────────────────────────
// Marco genera la estrategia completa + copy + prompts de imagen

const marcoSchema = z.object({
  productDescription: z.string().min(10, 'Describe el producto con al menos 10 caracteres'),
  objective: z.enum(['top_of_mind', 'reactivacion', 'educativo', 'cierre', 'recuperacion', 'sector_especifico']),
  targetSegment: z.array(z.enum(['IM', 'DS', 'CF'])).min(1),
  productPhotoUrls: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
  vendorName: z.enum(['John', 'Lady']).optional(),
})

router.post('/:id/marco', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const body = marcoSchema.parse(req.body)
    const result = await generateCampaignWithMarco(body as MarcoRequest)
    res.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    const msg = err instanceof Error ? err.message : 'Error en Marco IA'
    console.error('[marco] error:', err)
    res.status(500).json({ error: msg })
  }
})

// ── POST /api/campaigns/:id/apply-marco ───────────────────────
// Aplica la estrategia de Marco: crea steps + dispara Nano Banana

router.post('/:id/apply-marco', requireRole('GERENTE', 'VENTAS'), async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } })
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
    if (campaign.status !== 'BORRADOR') return res.status(400).json({ error: 'Solo en BORRADOR' })

    const { steps: marcoSteps, generateImages = false } = req.body as {
      steps: Array<{
        order: number
        type: string
        content: string
        imagePrompt?: string
        imageTemplate?: string
        imageAspect?: string
        delaySeconds: number
      }>
      generateImages?: boolean
    }

    if (!marcoSteps?.length) return res.status(400).json({ error: 'No hay pasos que aplicar' })

    // Eliminar steps previos
    await prisma.campaignStep.deleteMany({ where: { campaignId: req.params.id } })

    const createdSteps = []
    const imageJobs: { stepId: string; prompt: string; template: string; aspect: string }[] = []

    for (const s of marcoSteps) {
      const step = await prisma.campaignStep.create({
        data: {
          campaignId: req.params.id,
          order: s.order,
          type: s.type as any,
          content: s.content,
          delaySeconds: s.delaySeconds ?? 10,
        },
      })
      createdSteps.push(step)

      if (generateImages && s.type === 'IMAGE' && s.imagePrompt) {
        imageJobs.push({
          stepId: step.id,
          prompt: s.imagePrompt,
          template: s.imageTemplate ?? 'lanzamiento',
          aspect: s.imageAspect ?? '1:1',
        })
      }
    }

    // Lanzar generación de imágenes en background
    if (imageJobs.length > 0) {
      ;(async () => {
        for (const job of imageJobs) {
          try {
            const result = await generateCampaignImage({
              prompt: job.prompt,
              template: job.template as any,
              aspectRatio: job.aspect as any,
              brandLock: true,
            })
            await prisma.campaignStep.update({
              where: { id: job.stepId },
              data: { mediaUrl: result.fileUrl },
            })
          } catch (err) {
            console.error(`[apply-marco] Image gen failed for step ${job.stepId}:`, err)
          }
        }
      })()
    }

    res.json({
      ok: true,
      stepsCreated: createdSteps.length,
      imageJobsQueued: imageJobs.length,
    })
  } catch (err) {
    console.error('[apply-marco] error:', err)
    res.status(500).json({ error: 'Error al aplicar estrategia de Marco' })
  }
})

export default router
