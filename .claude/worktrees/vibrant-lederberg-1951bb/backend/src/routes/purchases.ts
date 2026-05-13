import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive(),
  unitCost: z.number().min(0),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Proveedor requerido'),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Al menos un ítem requerido'),
});

// GET /api/purchases
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const status = req.query.status as string;
    const supplierId = req.query.supplierId as string;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [purchases, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, city: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      data: purchases,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Error al obtener órdenes de compra' });
  }
});

// GET /api/purchases/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { id: true, reference: true, name: true, unit: true, stock: true },
            },
          },
        },
      },
    });

    if (!purchase) {
      res.status(404).json({ error: 'Orden de compra no encontrada' });
      return;
    }

    res.json(purchase);
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Error al obtener orden de compra' });
  }
});

// POST /api/purchases
router.post('/', requireRole('GERENTE', 'LOGISTICA'), async (req: AuthRequest, res: Response) => {
  try {
    const validation = purchaseOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { items, ...rest } = validation.data;
    const total = items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);

    const purchase = await prisma.purchaseOrder.create({
      data: {
        ...rest,
        total,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, reference: true, name: true } } } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'PurchaseOrder',
        entityId: purchase.id,
        metadata: { number: purchase.number, total },
      },
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Error al crear orden de compra' });
  }
});

// PUT /api/purchases/:id/receive
router.put('/:id/receive', requireRole('GERENTE', 'LOGISTICA'), async (req: AuthRequest, res: Response) => {
  try {
    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!purchase) {
      res.status(404).json({ error: 'Orden de compra no encontrada' });
      return;
    }

    if (purchase.status === 'RECIBIDA') {
      res.status(400).json({ error: 'Esta orden ya fue recibida' });
      return;
    }

    if (purchase.status === 'CANCELADA') {
      res.status(400).json({ error: 'No se puede recibir una orden cancelada' });
      return;
    }

    // Optionally receive specific items or all
    const itemIds = req.body.itemIds as string[] | undefined;
    const itemsToReceive = itemIds
      ? purchase.items.filter((i) => itemIds.includes(i.id) && !i.received)
      : purchase.items.filter((i) => !i.received);

    if (itemsToReceive.length === 0) {
      res.status(400).json({ error: 'No hay ítems pendientes de recibir' });
      return;
    }

    // Update inventory and mark items as received
    await prisma.$transaction([
      ...itemsToReceive.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        })
      ),
      ...itemsToReceive.map((item) =>
        prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'ENTRADA',
            qty: item.qty,
            reason: `Recepción OC #${purchase.number}`,
            referenceId: purchase.id,
            referenceType: 'PurchaseOrder',
          },
        })
      ),
      ...itemsToReceive.map((item) =>
        prisma.purchaseItem.update({
          where: { id: item.id },
          data: { received: true },
        })
      ),
    ]);

    // Check if all items are now received
    const allReceived = purchase.items.every(
      (i) => itemsToReceive.some((r) => r.id === i.id) || i.received
    );
    const newStatus = allReceived ? 'RECIBIDA' : 'PARCIAL';

    const updatedPurchase = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        receivedAt: allReceived ? new Date() : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, reference: true, name: true, stock: true } },
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'RECEIVE_PURCHASE',
        entityType: 'PurchaseOrder',
        entityId: purchase.id,
        metadata: { itemsReceived: itemsToReceive.length, allReceived },
      },
    });

    res.json(updatedPurchase);
  } catch (error) {
    console.error('Receive purchase error:', error);
    res.status(500).json({ error: 'Error al recibir orden de compra' });
  }
});

export default router;
