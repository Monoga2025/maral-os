import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  company: z.string().optional(),
  rut: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  category: z.enum(['FUNDADOR_HISTORICO', 'FUNDADOR_MARAL', 'ALIADO', 'PROSPECTO', 'IMPORTADOR', 'DISTRIBUIDOR', 'CLIENTE_FINAL']).optional(),
  howFound: z.string().optional(),
  allowWhiteLabel: z.boolean().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentDays: z.number().min(0).optional(),
  factoringStatus: z.enum(['APROBADO', 'EN_ESTUDIO', 'RECHAZADO', 'NO_APLICA']).optional(),
  purchaseFrequency: z.enum(['FRECUENTE', 'INTERMITENTE', 'ESPORADICA', 'NINGUNA']).optional(),
  isProvider: z.boolean().optional(),
  notes: z.string().optional(),
  merlinCode: z.string().optional(),
  interestTags: z.array(z.string().min(1).max(30)).optional(),
  optedOut: z.boolean().optional(),
  segment: z.string().min(1).max(10).optional().nullable(),
});

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const city = req.query.city as string;
    const tag = req.query.tag as string;
    const active = req.query.active !== 'false';

    const where: Record<string, unknown> = { active, isProvider: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { rut: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (tag) {
      where.interestTags = { has: tag };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          company: true,
          city: true,
          department: true,
          phone: true,
          whatsapp: true,
          email: true,
          category: true,
          factoringStatus: true,
          creditLimit: true,
          paymentDays: true,
          purchaseFrequency: true,
          interestTags: true,
          segment: true,
          optedOut: true,
          active: true,
          createdAt: true,
          _count: { select: { orders: true, quotations: true } },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { createdAt: true, status: true },
          },
          clientTags: {
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    // Map orders to lastOrders array of dates
    const data = clients.map((c) => {
      const { orders, clientTags, ...rest } = c;
      return {
        ...rest,
        lastOrderAt: orders[0]?.createdAt ?? null,
        lastOrders: orders.map((o) => o.createdAt),
        tags: clientTags.map((ct) => ct.tag),
      };
    });

    res.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/cities — distinct city list for filter dropdown
router.get('/cities', async (_req: AuthRequest, res: Response) => {
  try {
    const cities = await prisma.client.findMany({
      where: { active: true, isProvider: false, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    res.json(cities.map((c) => c.city).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ciudades' });
  }
});

// GET /api/clients/tags — all distinct interest tags
router.get('/tags', async (_req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { active: true, isProvider: false },
      select: { interestTags: true },
    });
    const tagSet = new Set<string>();
    clients.forEach((c) => c.interestTags.forEach((t) => tagSet.add(t)));
    res.json(Array.from(tagSet).sort());
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener etiquetas' });
  }
});

// PATCH /api/clients/bulk-segment — asignar segmento a múltiples clientes en lote
router.patch('/bulk-segment', async (req: AuthRequest, res: Response) => {
  try {
    const { ids, segment } = z.object({
      ids: z.array(z.string()).min(1).max(500),
      segment: z.string().min(1).max(10).nullable(),
    }).parse(req.body);

    const result = await prisma.client.updateMany({
      where: { id: { in: ids }, active: true },
      data: { segment },
    });

    res.json({ updated: result.count, segment });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error al actualizar segmentos' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, number: true, total: true, status: true, createdAt: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, number: true, amount: true, status: true, dueDate: true },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    // Calculate stats (parallel queries)
    const [totalOrders, totalSpentAgg, creditUsedAgg] = await Promise.all([
      prisma.order.count({ where: { clientId: req.params.id } }),
      prisma.order.aggregate({
        where: { clientId: req.params.id, status: { not: 'CANCELADO' } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { clientId: req.params.id, status: { in: ['VIGENTE', 'VENCIDA'] } },
        _sum: { amount: true },
      }),
    ]);
    const totalSpent = totalSpentAgg._sum.total || 0;
    const lastOrder = client.orders[0] ?? null;
    const creditUsed = Number(creditUsedAgg._sum.amount ?? 0);

    res.json({
      ...client,
      creditUsed,
      totalPurchases: totalSpent,
      ordersCount: totalOrders,
      lastOrderAt: lastOrder?.createdAt || null,
      stats: {
        totalOrders,
        totalSpent,
        avgTicket: totalOrders > 0 ? totalSpent / totalOrders : 0,
        lastOrderDate: lastOrder?.createdAt || null,
      },
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// POST /api/clients
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = clientSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { merlinCode, ...rest } = validation.data;

    // Upsert by merlinCode when provided (prevents duplicates on re-sync)
    let client;
    if (merlinCode) {
      const existing = await prisma.client.findFirst({ where: { merlinCode } });
      if (existing) {
        client = await prisma.client.update({
          where: { id: existing.id },
          data: { ...rest, merlinCode } as any,
        });
      } else {
        client = await prisma.client.create({ data: { ...rest, merlinCode } as any });
      }
    } else {
      client = await prisma.client.create({ data: validation.data as any });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Client',
        entityId: client.id,
        metadata: { name: client.name },
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const validation = clientSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: validation.data as any,
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Client',
        entityId: client.id,
        metadata: { name: client.name },
      },
    });

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    await prisma.client.update({
      where: { id: req.params.id },
      data: { active: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entityType: 'Client',
        entityId: req.params.id,
        metadata: { name: existing.name },
      },
    });

    res.json({ message: 'Cliente desactivado exitosamente' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// GET /api/clients/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.params.id;

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const [totalOrders, totalSpentAgg, lastOrder, quotationsCount, invoiceAgg] = await Promise.all([
      prisma.order.count({ where: { clientId } }),
      prisma.order.aggregate({
        where: { clientId, status: { not: 'CANCELADO' } },
        _sum: { total: true },
      }),
      prisma.order.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, status: true },
      }),
      prisma.quotation.count({ where: { clientId } }),
      prisma.invoice.aggregate({
        where: { clientId, status: 'VENCIDA' },
        _sum: { amount: true },
      }),
    ]);

    const totalSpent = totalSpentAgg._sum.total || 0;

    res.json({
      totalOrders,
      totalSpent,
      avgTicket: totalOrders > 0 ? totalSpent / totalOrders : 0,
      lastOrderDate: lastOrder?.createdAt || null,
      quotationsCount,
      overdueAmount: invoiceAgg._sum.amount || 0,
    });
  } catch (error) {
    console.error('Client stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
