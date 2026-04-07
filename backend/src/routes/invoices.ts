import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const invoiceSchema = z.object({
  orderId: z.string().optional(),
  clientId: z.string().min(1, 'Cliente requerido'),
  amount: z.number().positive('Monto debe ser positivo'),
  dueDate: z.string().datetime('Fecha de vencimiento inválida'),
});

// GET /api/invoices/credit-summary (must be before /:id)
router.get('/credit-summary', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // Get clients with factoring
    const clients = await prisma.client.findMany({
      where: { active: true, creditLimit: { gt: 0 } },
      select: {
        id: true,
        name: true,
        company: true,
        creditLimit: true,
        paymentDays: true,
        factoringStatus: true,
        invoices: {
          where: { status: { not: 'PAGADA' } },
          select: { id: true, amount: true, dueDate: true, status: true },
        },
      },
    });

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const byClient = clients.map((client) => {
      const usedCredit = client.invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const overdueInvoices = client.invoices.filter(
        (inv) => new Date(inv.dueDate) < now
      );
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

      let maxDaysOverdue = 0;
      overdueInvoices.forEach((inv) => {
        const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days > maxDaysOverdue) maxDaysOverdue = days;
      });

      return {
        client: {
          id: client.id,
          name: client.name,
          company: client.company,
        },
        cupo: client.creditLimit,
        usado: usedCredit,
        disponible: client.creditLimit - usedCredit,
        diasMora: maxDaysOverdue,
        factoringStatus: client.factoringStatus,
        overdueAmount,
      };
    });

    const totalVencida = byClient.reduce((s, c) => s + c.overdueAmount, 0);
    const totalVigente = byClient.reduce((s, c) => s + Math.max(0, c.usado - c.overdueAmount), 0);

    // Sum of invoices due within next 7 days (not yet overdue)
    const proximaVencer = clients.reduce((sum, client) => {
      const upcoming = client.invoices
        .filter((inv) => new Date(inv.dueDate) >= now && new Date(inv.dueDate) <= sevenDaysFromNow)
        .reduce((s, inv) => s + inv.amount, 0);
      return sum + upcoming;
    }, 0);

    res.json({
      totalVigente,
      totalVencida,
      proximaVencer,
      byClient,
    });
  } catch (error) {
    console.error('Credit summary error:', error);
    res.status(500).json({ error: 'Error al obtener resumen de cartera' });
  }
});

// GET /api/invoices
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;

    const now = new Date();

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true } },
          order: { select: { id: true, number: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate days overdue based on dueDate, regardless of status
    const invoicesWithDays = invoices.map((inv) => ({
      ...inv,
      daysOverdue:
        new Date(inv.dueDate) < now
          ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
    }));

    res.json({
      data: invoicesWithDays,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    const now = new Date();
    res.json({
      ...invoice,
      daysOverdue:
        new Date(invoice.dueDate) < now
          ? Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

// POST /api/invoices
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = invoiceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { dueDate, ...rest } = validation.data;

    const invoice = await prisma.invoice.create({
      data: {
        ...rest,
        dueDate: new Date(dueDate),
      },
      include: {
        client: { select: { id: true, name: true } },
        order: { select: { id: true, number: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: { number: invoice.number, amount: invoice.amount },
      },
    });

    // Encolar sync hacia Merlin (el agente local maral_to_merlin.py lo procesará)
    await prisma.merlinSyncQueue.create({
      data: { invoiceId: invoice.id },
    }).catch((err: Error) => {
      // No fallar la creación de la factura si la cola falla
      console.error('MerlinSyncQueue create error:', err);
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

// PUT /api/invoices/:id/pay
router.put('/:id/pay', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });

    if (!invoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    if (invoice.status === 'PAGADA') {
      res.status(400).json({ error: 'Esta factura ya fue pagada' });
      return;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: 'PAGADA',
        paidAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PAY_INVOICE',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: { number: invoice.number, amount: invoice.amount },
      },
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Pay invoice error:', error);
    res.status(500).json({ error: 'Error al registrar pago de factura' });
  }
});

export default router;
