import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import evolutionApi from '../lib/evolutionApi';

const router = Router();
router.use(authenticate);

// Resolver `:id` — acepta cuid o número secuencial (ej. /pedidos/7)
router.param('id', async (req, res, next, raw: string) => {
  if (!/^\d+$/.test(raw)) return next();
  try {
    const found = await prisma.order.findFirst({
      where: { number: parseInt(raw, 10) },
      select: { id: true },
    });
    if (!found) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    req.params.id = found.id;
    next();
  } catch (error) {
    console.error('Resolve order id error:', error);
    res.status(500).json({ error: 'Error al resolver pedido' });
  }
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
    }
  },
});

const orderItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().min(0.01),
  unitPrice: z.number().min(0),
});

const orderSchema = z.object({
  quotationId: z.string().optional(),
  clientId: z.string().min(1, 'Cliente requerido'),
  confirmed: z.boolean().optional().default(false),
  recipientName: z.string().min(1, 'Nombre del destinatario requerido'),
  address: z.string().min(1, 'Dirección requerida'),
  city: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  carrier: z.string().optional().default(''),
  freightPayer: z.string().optional().default('Remitente'),
  freightPayment: z.string().optional().default(''),
  type: z.enum(['PEDIDO', 'GARANTIA', 'MUESTRA']).optional().default('PEDIDO'),
  notes: z.string().optional(),
  sourceCampaignId: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Al menos un ítem requerido'),
});

// GET /api/orders/check-duplicate (must be before /:id)
router.get('/check-duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) {
      res.status(400).json({ error: 'clientId requerido' });
      return;
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const pendingOrder = await prisma.order.findFirst({
      where: {
        clientId,
        confirmed: false,
        status: 'CONFIRMADO',
        createdAt: { gte: threeDaysAgo },
      },
      select: { id: true, number: true, createdAt: true },
    });

    res.json({ hasDuplicate: !!pendingOrder, order: pendingOrder });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ error: 'Error al verificar duplicados' });
  }
});

// GET /api/orders
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;
    const search = req.query.search as string;
    const kanban = req.query.kanban === 'true';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { guideNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (kanban) {
      // Return grouped by status for kanban view
      const statuses = ['CONFIRMADO', 'EN_PRODUCCION', 'LISTO', 'EMPACADO', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'];
      const grouped: Record<string, unknown[]> = {};

      await Promise.all(
        statuses.map(async (s) => {
          const orders = await prisma.order.findMany({
            where: { ...where, status: s as never },
            orderBy: { createdAt: 'desc' },
            include: {
              client: { select: { id: true, name: true, city: true } },
              _count: { select: { items: true } },
            },
          });
          grouped[s] = orders;
        })
      );

      res.json(grouped);
      return;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, city: true } },
          _count: { select: { items: true, photos: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/orders/:id  (acepta cuid o número secuencial, ver router.param)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        quotation: { select: { id: true, number: true } },
        updatedBy: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, reference: true, name: true, unit: true, stock: true },
            },
          },
        },
        photos: { orderBy: { uploadedAt: 'asc' } },
        productionOrders: {
          include: {
            product: { select: { id: true, reference: true, name: true } },
            assignedUser: { select: { id: true, name: true } },
          },
        },
        invoices: { select: { id: true, number: true, amount: true, status: true, dueDate: true } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
});

// POST /api/orders
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = orderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { items, sourceCampaignId, ...rest } = validation.data;
    const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

    const order = await prisma.order.create({
      data: {
        ...rest,
        total,
        sourceCampaignId: sourceCampaignId ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, reference: true, name: true } } } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Order',
        entityId: order.id,
        metadata: { number: order.number, total, clientId: order.clientId },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    const updateSchema = z.object({
      status: z.enum(['CONFIRMADO', 'EN_PRODUCCION', 'LISTO', 'EMPACADO', 'DESPACHADO', 'ENTREGADO', 'CANCELADO']).optional(),
      confirmed: z.boolean().optional(),
      guideNumber: z.string().optional(),
      dianInvoiceNumber: z.string().optional(),
      dispatchDate: z.string().datetime().optional(),
      notes: z.string().optional(),
      recipientName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      carrier: z.string().optional(),
      freightPayer: z.string().optional(),
      freightPayment: z.string().optional(),
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { dispatchDate, ...rest } = validation.data;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, reference: true, name: true } } } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: order.id,
        metadata: { status: order.status },
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, guideNumber, dispatchDate, creditDispatch, dianInvoiceNumber } = req.body;
    const validStatuses = ['CONFIRMADO', 'EN_PRODUCCION', 'LISTO', 'EMPACADO', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: status as never,
        updatedById: req.user!.userId,
        ...(guideNumber !== undefined ? { guideNumber } : {}),
        ...(dispatchDate ? { dispatchDate: new Date(dispatchDate) } : {}),
        ...(dianInvoiceNumber !== undefined ? { dianInvoiceNumber } : {}),
      },
    });

    if (status === 'DESPACHADO' && creditDispatch) {
      const client = await prisma.client.findUnique({
        where: { id: order.clientId },
        select: { paymentDays: true },
      });
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (client?.paymentDays || 30));
      const existingInvoice = await prisma.invoice.findFirst({ where: { orderId: order.id } });
      if (existingInvoice) {
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: { amount: order.total, dueDate, clientId: order.clientId },
        });
      } else {
        await prisma.invoice.create({
          data: { orderId: order.id, clientId: order.clientId, amount: order.total, dueDate },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: order.id,
        metadata: { status: order.status },
      },
    });

    // Notificaciones WhatsApp (fire-and-forget)
    // Order tiene phone/recipientName propios; para datos de cliente/seller hacemos query puntual
    const recipientPhone = order.phone ?? null;
    const recipientName  = order.recipientName ?? '';

    if (status === 'DESPACHADO') {
      evolutionApi.notifyOrderDispatched(recipientPhone, recipientName, order.number, order.carrier ?? '', guideNumber);
    } else if (status === 'LISTO') {
      // Notifica al asesor comercial (via seller del pedido o del user actual)
      const sellerUser = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { name: true, whatsapp: true, phone: true },
      });
      const sellerPhone = sellerUser?.whatsapp ?? sellerUser?.phone ?? null;
      const clientSnap  = await prisma.client.findUnique({
        where: { id: order.clientId },
        select: { name: true, company: true },
      });
      const clientName = clientSnap?.company ?? clientSnap?.name ?? recipientName;
      evolutionApi.notifyProductionReady(sellerPhone, sellerUser?.name ?? '', order.number, clientName);
    } else if (status === 'ENTREGADO') {
      evolutionApi.notifyOrderStatusChange(recipientPhone, recipientName, order.number, 'ENTREGADO');

      // T4.5 — update campaign metrics if this order came from a campaign
      if (order.sourceCampaignId) {
        const [recipient] = await Promise.all([
          prisma.campaignRecipient.findFirst({
            where: { clientId: order.clientId, campaignId: order.sourceCampaignId },
          }),
        ]);
        if (recipient) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              convertedAt: recipient.convertedAt ?? new Date(),
              revenueCOP: order.total,
              status: 'CONVERTED',
            },
          });
        }
        await prisma.campaignMetric.upsert({
          where: { campaignId: order.sourceCampaignId },
          update: {
            converted: { increment: 1 },
            revenueCOP: { increment: order.total },
          },
          create: {
            campaignId: order.sourceCampaignId,
            converted: 1,
            revenueCOP: order.total,
          },
        });
      }
    }

    res.json(order);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// PATCH /api/orders/:id/items/:itemId/pick
router.patch('/:id/items/:itemId/pick', async (req: AuthRequest, res: Response) => {
  try {
    const { picked } = req.body as { picked: boolean };
    const item = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: { picked: Boolean(picked) },
    });
    res.json(item);
  } catch (error) {
    console.error('Pick item error:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// PATCH /api/orders/:id/items/:itemId/disposition
router.patch('/:id/items/:itemId/disposition', async (req: AuthRequest, res: Response) => {
  try {
    const { disposition } = req.body;
      const valid = ['PENDIENTE', 'STOCK', 'PRODUCCION'];
    if (!disposition || !valid.includes(disposition)) {
      res.status(400).json({ error: 'Disposición inválida. Valores: PENDIENTE, STOCK, PRODUCCION' });
      return;
    }

    const item = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: { disposition: disposition as never },
      include: { product: { select: { id: true, reference: true, name: true, unit: true, stock: true } } },
    });

    if (disposition === 'PRODUCCION') {
      const existing = await prisma.productionOrder.findFirst({
        where: { orderId: req.params.id, productId: item.productId, status: { not: 'EMPACADO' } },
      });
      if (!existing) {
        await prisma.productionOrder.create({
          data: {
            orderId: req.params.id,
            productId: item.productId,
            qty: item.qty,
            phase: 'BASICO',
            status: 'PENDIENTE',
          },
        });
      }
    }

    res.json(item);
  } catch (error) {
    console.error('Update item disposition error:', error);
    res.status(500).json({ error: 'Error al actualizar disposición del ítem' });
  }
});

// POST /api/orders/:id/photos
router.post('/:id/photos', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ninguna foto' });
      return;
    }

    const phase = req.body.phase as string | undefined;
    const fileUrl = `/uploads/${req.file.filename}`;

    const photo = await prisma.orderPhoto.create({
      data: {
        orderId: req.params.id,
        url: fileUrl,
        phase,
      },
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Error al subir foto' });
  }
});

const COMPANY = {
  name: process.env.COMPANY_NAME || 'MARAL S.A.S.',
  nit: process.env.COMPANY_NIT || '',
  address: process.env.COMPANY_ADDRESS || '',
  phone: process.env.COMPANY_PHONE || '',
  email: process.env.COMPANY_EMAIL || 'ventas@maral.com.co',
  website: process.env.COMPANY_WEBSITE || 'www.maral.com.co',
};

async function fetchOrderForPdf(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true, name: true, company: true, rut: true,
          city: true, phone: true, email: true, address: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true, reference: true, name: true, unit: true,
              warrantyYears: true, specs: true,
            },
          },
        },
      },
      photos: { where: { phase: 'EMPACADO' } },
    },
  });
}

// GET /api/orders/:id/dispatch-pdf-data  (JSON — datos para PDF en frontend)
router.get('/:id/dispatch-pdf-data', async (req: AuthRequest, res: Response) => {
  try {
    const order = await fetchOrderForPdf(req.params.id);
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
    res.json({ order, generatedAt: new Date().toISOString(), company: COMPANY });
  } catch (error) {
    console.error('Dispatch PDF data error:', error);
    res.status(500).json({ error: 'Error al obtener datos del despacho' });
  }
});

// GET /api/orders/:id/dispatch-pdf  (blob PDF descargable)
router.get('/:id/dispatch-pdf', async (req: AuthRequest, res: Response) => {
  try {
    const order = await fetchOrderForPdf(req.params.id);
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

    // Dynamic import of pdfkit (install: npm install pdfkit @types/pdfkit)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="remision-${order.number}.pdf"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text(COMPANY.name, { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor('#555555');
    if (COMPANY.nit) doc.text(`NIT: ${COMPANY.nit}`);
    if (COMPANY.address) doc.text(COMPANY.address);
    if (COMPANY.phone) doc.text(`Tel: ${COMPANY.phone}`);
    doc.text(COMPANY.email);

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').stroke();
    doc.moveDown(0.5);

    // ── Title ────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      .text(`REMISIÓN DE DESPACHO #${order.number}`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
    doc.moveDown(1);

    // ── Client Info ──────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('DATOS DEL CLIENTE');
    doc.fontSize(9).font('Helvetica');
    doc.text(`Cliente: ${order.client.name}${order.client.company ? ` — ${order.client.company}` : ''}`);
    if (order.client.rut) doc.text(`NIT/CC: ${order.client.rut}`);
    doc.moveDown(0.3);
    doc.text(`Destinatario: ${order.recipientName}`);
    doc.text(`Dirección: ${order.address}, ${order.city}`);
    if (order.phone) doc.text(`Teléfono: ${order.phone}`);
    doc.moveDown(0.3);
    doc.text(`Transportadora: ${order.carrier}   Flete: ${order.freightPayment} — Paga: ${order.freightPayer}`);
    if (order.guideNumber) doc.text(`Guía: ${order.guideNumber}`);
    doc.moveDown(1);

    // ── Items Table ──────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').text('PRODUCTOS');
    doc.moveDown(0.3);

    const colRef = 50, colName = 120, colQty = 390, colUnit = 430, colPrice = 475;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
    doc.text('REF', colRef, doc.y, { width: 65 });
    doc.text('PRODUCTO', colName, doc.y - doc.currentLineHeight(), { width: 265 });
    doc.text('CANT', colQty, doc.y - doc.currentLineHeight(), { width: 35, align: 'right' });
    doc.text('UNID', colUnit, doc.y - doc.currentLineHeight(), { width: 40 });
    doc.text('PRECIO', colPrice, doc.y - doc.currentLineHeight(), { width: 70, align: 'right' });
    doc.moveDown(0.2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#AAAAAA').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#000000');
    for (const item of order.items) {
      const y = doc.y;
      doc.fontSize(8).text(item.product.reference, colRef, y, { width: 65 });
      doc.text(item.product.name, colName, y, { width: 265 });
      doc.text(String(item.qty), colQty, y, { width: 35, align: 'right' });
      doc.text(item.product.unit, colUnit, y, { width: 40 });
      doc.text(`$${item.unitPrice.toLocaleString('es-CO')}`, colPrice, y, { width: 70, align: 'right' });
      doc.moveDown(0.8);
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#AAAAAA').stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`TOTAL: $${order.total.toLocaleString('es-CO')}`, { align: 'right' });

    // ── Notes ────────────────────────────────────────────────
    if (order.notes) {
      doc.moveDown(0.8);
      doc.fontSize(9).font('Helvetica-Bold').text('Observaciones:');
      doc.font('Helvetica').text(order.notes);
    }

    // ── Signatures ───────────────────────────────────────────
    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#000000').stroke();
    doc.moveTo(345, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica')
      .text('Entregado por', 50, doc.y, { width: 150, align: 'center' })
      .text('Recibido por', 345, doc.y - doc.currentLineHeight(), { width: 200, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Dispatch PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar PDF de despacho' });
    }
  }
});

export default router;
