import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const supplierSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/suppliers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const active = req.query.active !== 'false';
    const suppliers = await prisma.supplier.findMany({
      where: { active },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, number: true, status: true, total: true, createdAt: true },
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

// POST /api/suppliers
router.post('/', requireRole('GERENTE', 'LOGISTICA'), async (req: AuthRequest, res: Response) => {
  try {
    const validation = supplierSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const supplier = await prisma.supplier.create({ data: validation.data });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Supplier',
        entityId: supplier.id,
        metadata: { name: supplier.name },
      },
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', requireRole('GERENTE', 'LOGISTICA'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    const validation = supplierSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: validation.data,
    });

    res.json(supplier);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

export default router;
