import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase()) &&
               /jpeg|jpg|png|webp/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Solo se permiten imágenes'));
  },
});

const router = Router();
router.use(authenticate);

const expenseSchema = z.object({
  date: z.string().datetime(),
  concept: z.string().min(1, 'Concepto requerido'),
  amount: z.number().min(0.01, 'Monto debe ser mayor a 0'),
  type: z.enum(['CAJA_MENOR', 'TARJETA']),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/expenses
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const type = req.query.type as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    // Empleados solo ven sus propios gastos; GERENTE/VENTAS ven todos
    if (req.user!.role === 'LOGISTICA') {
      where.createdById = req.user!.userId;
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    // Totales para el período
    const totals = await prisma.expense.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });

    res.json({
      data: expenses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totals: totals.reduce(
        (acc, t) => ({ ...acc, [t.type]: t._sum.amount ?? 0 }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// POST /api/expenses
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = expenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        ...validation.data,
        date: new Date(validation.data.date),
        createdById: req.user!.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Expense',
        entityId: expense.id,
        metadata: { concept: expense.concept, amount: expense.amount, type: expense.type },
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }

    // Empleados solo ven sus propios gastos
    if (req.user!.role === 'LOGISTICA' && expense.createdById !== req.user!.userId) {
      res.status(403).json({ error: 'No tienes permiso para ver este gasto' });
      return;
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Error al obtener gasto' });
  }
});

// PATCH /api/expenses/:id/approve — solo GERENTE o VENTAS
router.patch('/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === 'LOGISTICA') {
      res.status(403).json({ error: 'No tienes permiso para aprobar gastos' });
      return;
    }

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }

    if (existing.approvedById) {
      res.status(400).json({ error: 'Este gasto ya fue aprobado' });
      return;
    }

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'APPROVE',
        entityType: 'Expense',
        entityId: expense.id,
        metadata: { amount: expense.amount, concept: expense.concept },
      },
    });

    res.json(expense);
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ error: 'Error al aprobar gasto' });
  }
});

// POST /api/expenses/:id/receipt — sube foto del comprobante
router.post('/:id/receipt', receiptUpload.single('receipt'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Gasto no encontrado' });
      return;
    }
    if (req.user!.role === 'LOGISTICA' && existing.createdById !== req.user!.userId) {
      res.status(403).json({ error: 'No tienes permiso para editar este gasto' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo' });
      return;
    }
    const receiptUrl = `/uploads/${req.file.filename}`;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { receiptUrl },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    res.json(expense);
  } catch (error) {
    console.error('Upload expense receipt error:', error);
    res.status(500).json({ error: 'Error al subir comprobante' });
  }
});

export default router;
