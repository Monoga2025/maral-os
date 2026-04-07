import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const movementSchema = z.object({
  productId: z.string().min(1, 'Producto requerido'),
  type: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION']),
  qty: z.number().positive('Cantidad debe ser positiva'),
  reason: z.string().min(1, 'Razón requerida'),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

// GET /api/inventory
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const stockStatus = req.query.stockStatus as string;

    const where: Record<string, unknown> = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        reference: true,
        name: true,
        category: true,
        line: true,
        stock: true,
        minStock: true,
        unit: true,
        location: true,
        cost: true,
        priceList: true,
      },
    });

    const productsWithStatus = products
      .map((p) => ({
        ...p,
        stockStatus:
          p.minStock > 0 && p.stock === 0 ? 'SIN_STOCK'
          : p.minStock > 0 && p.stock <= p.minStock ? 'CRITICO'
          : 'OK',
        stockValue: p.stock * p.cost,
      }))
      .filter((p) => {
        if (!stockStatus) return true;
        return p.stockStatus === stockStatus;
      });

    const summary = {
      total: products.length,
      sinStock: productsWithStatus.filter((p) => p.stockStatus === 'SIN_STOCK').length,
      critico: productsWithStatus.filter((p) => p.stockStatus === 'CRITICO').length,
      ok: productsWithStatus.filter((p) => p.stockStatus === 'OK').length,
      totalValue: productsWithStatus.reduce((sum, p) => sum + p.stockValue, 0),
    };

    res.json({ data: productsWithStatus, summary });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

// POST /api/inventory/movement
router.post('/movement', async (req: AuthRequest, res: Response) => {
  try {
    const validation = movementSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { productId, type, qty, reason, referenceId, referenceType } = validation.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    let newStock = product.stock;
    if (type === 'ENTRADA' || type === 'DEVOLUCION') {
      newStock += qty;
    } else if (type === 'SALIDA') {
      newStock -= qty;
      if (newStock < 0) {
        res.status(400).json({ error: `Stock insuficiente. Stock actual: ${product.stock}` });
        return;
      }
    } else if (type === 'AJUSTE') {
      newStock = qty; // absolute value for AJUSTE
    }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: { productId, type, qty, reason, referenceId, referenceType },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'INVENTORY_MOVEMENT',
        entityType: 'Product',
        entityId: productId,
        metadata: { type, qty, reason, previousStock: product.stock, newStock },
      },
    });

    res.status(201).json({
      movement,
      product: { id: updatedProduct.id, reference: updatedProduct.reference, stock: updatedProduct.stock },
    });
  } catch (error) {
    console.error('Create movement error:', error);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
});

// GET /api/inventory/movements
router.get('/movements', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const productId = req.query.productId as string;
    const type = req.query.type as string;
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (fromDate || toDate) {
      where.createdAt = {};
      const dateFilter = where.createdAt as Record<string, Date>;
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) dateFilter.lte = new Date(toDate);
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, reference: true, name: true, unit: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res.json({
      data: movements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// GET /api/inventory/alerts
router.get('/alerts', async (req: AuthRequest, res: Response) => {
  try {
    const criticalProducts = await prisma.$queryRaw<
      { id: string; reference: string; name: string; stock: number; minStock: number; unit: string; category: string }[]
    >`
      SELECT id, reference, name, stock, "minStock", unit, category
      FROM "Product"
      WHERE active = true AND stock <= "minStock"
      ORDER BY stock ASC
    `;

    const withStatus = criticalProducts.map((p) => ({
      ...p,
      stockStatus: p.stock === 0 ? 'SIN_STOCK' : 'CRITICO',
      shortage: p.minStock - p.stock,
    }));

    res.json({
      count: withStatus.length,
      products: withStatus,
    });
  } catch (error) {
    console.error('Inventory alerts error:', error);
    res.status(500).json({ error: 'Error al obtener alertas de inventario' });
  }
});

export default router;
