import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex #RRGGBB').default('#3B82F6'),
  description: z.string().max(200).optional(),
})

// GET /api/tags — listar todas las etiquetas con conteo de clientes
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { clientTags: true } } },
    })
    res.json(tags.map((t) => ({ ...t, clientCount: t._count.clientTags })))
  } catch {
    res.status(500).json({ error: 'Error al obtener etiquetas' })
  }
})

// POST /api/tags — crear etiqueta
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = tagSchema.parse(req.body)
    const tag = await prisma.tag.create({ data })
    res.status(201).json(tag)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' })
    res.status(500).json({ error: 'Error al crear etiqueta' })
  }
})

// PATCH /api/tags/bulk-assign — asignar etiquetas a múltiples clientes en lote
router.patch('/bulk-assign', async (req: AuthRequest, res: Response) => {
  try {
    const { clientIds, tagIds, action } = z.object({
      clientIds: z.array(z.string()).min(1).max(500),
      tagIds: z.array(z.string()).min(1),
      action: z.enum(['add', 'remove', 'replace']).default('add'),
    }).parse(req.body)

    if (action === 'replace') {
      await prisma.clientTag.deleteMany({ where: { clientId: { in: clientIds } } })
    } else if (action === 'remove') {
      await prisma.clientTag.deleteMany({
        where: { clientId: { in: clientIds }, tagId: { in: tagIds } },
      })
      return res.json({ ok: true })
    }

    const pairs = clientIds.flatMap((clientId) =>
      tagIds.map((tagId) => ({ clientId, tagId }))
    )
    await prisma.clientTag.createMany({ data: pairs, skipDuplicates: true })
    res.json({ ok: true, assigned: pairs.length })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: 'Error al asignar etiquetas' })
  }
})

// PUT /api/tags/:id — editar etiqueta
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = tagSchema.partial().parse(req.body)
    const tag = await prisma.tag.update({ where: { id: req.params.id }, data })
    res.json(tag)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Etiqueta no encontrada' })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' })
    res.status(500).json({ error: 'Error al editar etiqueta' })
  }
})

// DELETE /api/tags/:id — eliminar etiqueta (desasocia clientes por CASCADE)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Etiqueta no encontrada' })
    res.status(500).json({ error: 'Error al eliminar etiqueta' })
  }
})

// GET /api/tags/:id/clients — clientes de una etiqueta
router.get('/:id/clients', async (req: AuthRequest, res: Response) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        clientTags: {
          include: { client: { select: { id: true, name: true, company: true, city: true, phone: true } } },
        },
      },
    })
    if (!tag) return res.status(404).json({ error: 'Etiqueta no encontrada' })
    res.json({ ...tag, clients: tag.clientTags.map((ct) => ct.client) })
  } catch {
    res.status(500).json({ error: 'Error al obtener clientes' })
  }
})

export default router
