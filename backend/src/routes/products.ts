import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  reference: z.string().min(1, 'Referencia requerida'),
  name: z.string().min(2, 'Nombre requerido'),
  line: z.enum(['ESTANDAR', 'PREMIUM']).optional(),
  category: z.enum([
    'ESTACION_BASE', 'MOVIL', 'HANDY', 'CABLE',
    'CONECTOR', 'BASE', 'ACCESORIO', 'MATERIA_PRIMA',
  ]),
  priceList: z.number().min(0, 'Precio lista inválido'),
  priceDistributor: z.number().min(0, 'Precio distribuidor inválido'),
  cost: z.number().min(0, 'Costo inválido'),
  warrantyYears: z.number().int().min(0).optional(),
  stock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unit: z.string().optional(),
  location: z.string().optional(),
  specs: z.record(z.unknown()).optional(),
  applications: z.array(z.string()).optional(),
});

const adjustStockSchema = z.object({
  qty: z.number().refine((n) => n !== 0, 'Cantidad no puede ser 0'),
  reason: z.string().min(1, 'Razón requerida'),
  type: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION']),
});

// GET /api/products
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const line = req.query.line as string;
    const active = req.query.active !== 'false';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 50;

    const where: Record<string, unknown> = { active };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (line) where.line = line;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Add stock status
    const productsWithStatus = products.map((p) => ({
      ...p,
      stockStatus:
        p.minStock > 0 && p.stock === 0 ? 'SIN_STOCK'
        : p.minStock > 0 && p.stock <= p.minStock ? 'CRITICO'
        : 'OK',
    }));

    res.json({
      data: productsWithStatus,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/low-stock (must be before /:id)
router.get('/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.$queryRaw<
      { id: string; reference: string; name: string; stock: number; minStock: number; category: string; unit: string }[]
    >`
      SELECT id, reference, name, stock, "minStock", category, unit
      FROM "Product"
      WHERE active = true AND "minStock" > 0 AND stock <= "minStock"
      ORDER BY (stock / NULLIF("minStock", 0)) ASC
    `;

    const withStatus = products.map((p) => ({
      ...p,
      stockStatus: p.stock === 0 ? 'SIN_STOCK' : 'CRITICO',
    }));

    res.json(withStatus);
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Error al obtener productos con stock bajo' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        inventoryMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({
      ...product,
      stockStatus:
        product.minStock > 0 && product.stock === 0 ? 'SIN_STOCK'
        : product.minStock > 0 && product.stock <= product.minStock ? 'CRITICO'
        : 'OK',
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const product = await prisma.product.create({ data: validation.data as never });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Product',
        entityId: product.id,
        metadata: { reference: product.reference, name: product.name },
      },
    });

    res.status(201).json(product);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un producto con esa referencia' });
      return;
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const validation = productSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: validation.data as never,
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: product.id,
        metadata: { reference: product.reference },
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// POST /api/products/:id/adjust-stock
router.post('/:id/adjust-stock', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const validation = adjustStockSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { qty, reason, type } = validation.data;

    let newStock = product.stock;
    if (type === 'ENTRADA' || type === 'DEVOLUCION') {
      newStock += qty;
    } else if (type === 'SALIDA') {
      newStock -= qty;
    } else if (type === 'AJUSTE') {
      newStock = qty; // For AJUSTE, qty is the new absolute value
    }

    if (newStock < 0) {
      res.status(400).json({ error: 'Stock insuficiente para realizar la salida' });
      return;
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: req.params.id },
        data: { stock: newStock },
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: req.params.id,
          type,
          qty: Math.abs(qty),
          reason,
          referenceType: 'MANUAL',
        },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'STOCK_ADJUST',
        entityType: 'Product',
        entityId: product.id,
        metadata: { type, qty, reason, previousStock: product.stock, newStock },
      },
    });

    res.json({ product: updatedProduct, movement });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
});

// GET /api/products/:id/components — receta (BOM) del kit
router.get('/:id/components', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const components = await prisma.productComponent.findMany({
      where: { kitId: req.params.id },
      include: {
        component: {
          select: { id: true, reference: true, name: true, unit: true, stock: true, category: true },
        },
      },
      orderBy: { component: { name: 'asc' } },
    });

    res.json(components);
  } catch (error) {
    console.error('Get kit components error:', error);
    res.status(500).json({ error: 'Error al obtener componentes del kit' });
  }
});

// PUT /api/products/:id/components — reemplazar toda la receta del kit
router.put('/:id/components', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const componentSchema = z.object({
      componentId: z.string().min(1),
      qty: z.number().min(0.001),
      unit: z.string().optional().default('und'),
    });
    const bodySchema = z.object({
      components: z.array(componentSchema),
    });

    const validation = bodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    // Evitar que un kit se contenga a sí mismo
    const selfRef = validation.data.components.find((c) => c.componentId === req.params.id);
    if (selfRef) {
      res.status(400).json({ error: 'Un kit no puede contener a sí mismo como componente' });
      return;
    }

    // Reemplazar componentes en transacción
    const [, components] = await prisma.$transaction([
      prisma.productComponent.deleteMany({ where: { kitId: req.params.id } }),
      prisma.productComponent.createMany({
        data: validation.data.components.map((c) => ({
          kitId: req.params.id,
          componentId: c.componentId,
          qty: c.qty,
          unit: c.unit ?? 'und',
        })),
      }),
    ]);

    // Marcar el producto como kit si tiene componentes
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isKit: validation.data.components.length > 0 },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_KIT_COMPONENTS',
        entityType: 'Product',
        entityId: req.params.id,
        metadata: { componentCount: components.count },
      },
    });

    // Devolver los componentes actualizados
    const updated = await prisma.productComponent.findMany({
      where: { kitId: req.params.id },
      include: {
        component: {
          select: { id: true, reference: true, name: true, unit: true, stock: true },
        },
      },
      orderBy: { component: { name: 'asc' } },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update kit components error:', error);
    res.status(500).json({ error: 'Error al actualizar componentes del kit' });
  }
});

export default router;
