import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const segmentSchema = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(60),
  discount: z.number().min(0).max(100).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().default(0),
})

// GET /api/segments
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const segments = await prisma.segment.findMany({ orderBy: { sortOrder: 'asc' } })
    const counts = await prisma.client.groupBy({
      by: ['segment'],
      where: { segment: { not: null }, active: true },
      _count: true,
    })
    const countMap: Record<string, number> = {}
    counts.forEach((c) => { if (c.segment) countMap[c.segment] = c._count })
    res.json(segments.map((s) => ({ ...s, clientCount: countMap[s.code] ?? 0 })))
  } catch {
    res.status(500).json({ error: 'Error al obtener segmentos' })
  }
})

// POST /api/segments
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = segmentSchema.parse(req.body)
    const segment = await prisma.segment.create({ data })
    res.status(201).json(segment)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe un segmento con ese código' })
    res.status(500).json({ error: 'Error al crear segmento' })
  }
})

// PUT /api/segments/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.segment.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Segmento no encontrado' })
    const data = segmentSchema.partial().parse(req.body)
    if (data.code && data.code !== existing.code) {
      const inUse = await prisma.client.count({ where: { segment: existing.code, active: true } })
      if (inUse > 0) return res.status(409).json({ error: `No se puede cambiar el código: ${inUse} clientes activos usan este segmento` })
    }
    const segment = await prisma.segment.update({ where: { id: req.params.id }, data })
    res.json(segment)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Segmento no encontrado' })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe un segmento con ese código' })
    res.status(500).json({ error: 'Error al actualizar segmento' })
  }
})

// DELETE /api/segments/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const seg = await prisma.segment.findUnique({ where: { id: req.params.id } })
    if (!seg) return res.status(404).json({ error: 'Segmento no encontrado' })
    const inUse = await prisma.client.count({ where: { segment: seg.code, active: true } })
    if (inUse > 0)
      return res.status(409).json({ error: `No se puede eliminar: ${inUse} clientes activos usan este segmento` })
    await prisma.segment.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Segmento no encontrado' })
    res.status(500).json({ error: 'Error al eliminar segmento' })
  }
})

export default router
