import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const productionOrderSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string().min(1, 'Producto requerido'),
  qty: z.number().min(0.01, 'Cantidad requerida'),
  phase: z.enum(['BASICO', 'PREENSAMBLE', 'ENSAMBLE_FINAL']).optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'EMPACADO']).optional(),
  notes: z.string().optional(),
  requiredDate: z.string().datetime().optional(),
});

// GET /api/production
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const status = req.query.status as string;
    const phase = req.query.phase as string;
    const orderId = req.query.orderId as string;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (phase) where.phase = phase;
    if (orderId) where.orderId = orderId;

    const [productionOrders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, reference: true, name: true, unit: true } },
          order: {
            select: {
              id: true,
              number: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.productionOrder.count({ where }),
    ]);

    res.json({
      data: productionOrders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get production orders error:', error);
    res.status(500).json({ error: 'Error al obtener órdenes de producción' });
  }
});

// GET /api/production/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const productionOrder = await prisma.productionOrder.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        order: {
          include: {
            client: { select: { id: true, name: true } },
            items: {
              include: {
                product: { select: { id: true, reference: true, name: true, stock: true } },
              },
            },
          },
        },
      },
    });

    if (!productionOrder) {
      res.status(404).json({ error: 'Orden de producción no encontrada' });
      return;
    }

    // Check material availability (if product has specs with materials)
    const product = productionOrder.product;
    const specs = product.specs as Record<string, unknown> | null;
    let materialsCheck: { available: boolean; materials: unknown[] } = { available: true, materials: [] };

    if (specs && specs.materials && Array.isArray(specs.materials)) {
      const materials = specs.materials as Array<{ productId: string; qtyPerUnit: number }>;
      const matProducts = await prisma.product.findMany({
        where: { id: { in: materials.map((m) => m.productId) } },
        select: { id: true, reference: true, name: true, stock: true, unit: true },
      });
      const matMap = new Map(matProducts.map((p) => [p.id, p]));
      const materialChecks = materials.map((mat) => {
        const matProduct = matMap.get(mat.productId) ?? null;
        const required = mat.qtyPerUnit * productionOrder.qty;
        return {
          product: matProduct,
          required,
          available: (matProduct?.stock || 0) >= required,
        };
      });

      materialsCheck = {
        available: materialChecks.every((m) => m.available),
        materials: materialChecks,
      };
    }

    res.json({ ...productionOrder, materialsCheck });
  } catch (error) {
    console.error('Get production order error:', error);
    res.status(500).json({ error: 'Error al obtener orden de producción' });
  }
});

// POST /api/production
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = productionOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { requiredDate, ...rest } = validation.data;

    const productionOrder = await prisma.productionOrder.create({
      data: {
        ...rest,
        requiredDate: requiredDate ? new Date(requiredDate) : undefined,
      },
      include: {
        product: { select: { id: true, reference: true, name: true } },
        order: { select: { id: true, number: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'ProductionOrder',
        entityId: productionOrder.id,
        metadata: { number: productionOrder.number, productId: productionOrder.productId },
      },
    });

    res.status(201).json(productionOrder);
  } catch (error) {
    console.error('Create production order error:', error);
    res.status(500).json({ error: 'Error al crear orden de producción' });
  }
});

// PUT /api/production/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.productionOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Orden de producción no encontrada' });
      return;
    }

    const updateSchema = productionOrderSchema.partial();
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { requiredDate, ...rest } = validation.data;

    const productionOrder = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        requiredDate: requiredDate ? new Date(requiredDate) : undefined,
      },
      include: {
        product: { select: { id: true, reference: true, name: true } },
        order: { select: { id: true, number: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'ProductionOrder',
        entityId: productionOrder.id,
        metadata: { status: productionOrder.status, phase: productionOrder.phase },
      },
    });

    res.json(productionOrder);
  } catch (error) {
    console.error('Update production order error:', error);
    res.status(500).json({ error: 'Error al actualizar orden de producción' });
  }
});

// PATCH /api/production/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'EMPACADO'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }

    const order = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: { status: status as never, updatedById: req.user!.userId },
      include: {
        product: { select: { id: true, reference: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'ProductionOrder',
        entityId: order.id,
        metadata: { status: order.status },
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update production status error:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;
