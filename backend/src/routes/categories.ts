import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const categorySchema = z.object({
  code: z.string().min(1).max(30).toUpperCase(),
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748B'),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().default(0),
})

// GET /api/categories
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
    const counts = await prisma.client.groupBy({
      by: ['category'],
      where: { active: true },
      _count: true,
    })
    const countMap: Record<string, number> = {}
    counts.forEach((c) => { if (c.category) countMap[c.category] = c._count })
    res.json(categories.map((c) => ({ ...c, clientCount: countMap[c.code] ?? 0 })))
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
})

// POST /api/categories
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = categorySchema.parse(req.body)
    const category = await prisma.category.create({ data })
    res.status(201).json(category)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe una categoría con ese código' })
    res.status(500).json({ error: 'Error al crear categoría' })
  }
})

// PUT /api/categories/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' })
    const data = categorySchema.partial().parse(req.body)
    if (data.code && data.code !== existing.code) {
      const inUse = await prisma.client.count({ where: { category: existing.code, active: true } })
      if (inUse > 0) return res.status(409).json({ error: `No se puede cambiar el código: ${inUse} clientes activos usan esta categoría` })
    }
    const category = await prisma.category.update({ where: { id: req.params.id }, data })
    res.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors })
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Categoría no encontrada' })
    if ((error as { code?: string }).code === 'P2002')
      return res.status(409).json({ error: 'Ya existe una categoría con ese código' })
    res.status(500).json({ error: 'Error al actualizar categoría' })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' })
    const inUse = await prisma.client.count({ where: { category: cat.code, active: true } })
    if (inUse > 0)
      return res.status(409).json({ error: `No se puede eliminar: ${inUse} clientes activos usan esta categoría` })
    await prisma.category.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025')
      return res.status(404).json({ error: 'Categoría no encontrada' })
    res.status(500).json({ error: 'Error al eliminar categoría' })
  }
})

export default router
