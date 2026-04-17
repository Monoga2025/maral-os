import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Resolver `:id` — acepta cuid o número secuencial (ej. /cotizaciones/12)
router.param('id', async (req, res, next, raw: string) => {
  if (!/^\d+$/.test(raw)) return next();
  try {
    const found = await prisma.quotation.findFirst({
      where: { number: parseInt(raw, 10) },
      select: { id: true },
    });
    if (!found) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }
    req.params.id = found.id;
    next();
  } catch (error) {
    console.error('Resolve quotation id error:', error);
    res.status(500).json({ error: 'Error al resolver cotización' });
  }
});

// ─── Empresa (datos para el PDF) ───────────────────────────────
function fmtNIT(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : raw;
}
const COMPANY = {
  name:    process.env.COMPANY_NAME    ?? 'MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S.',
  nit:     fmtNIT(process.env.COMPANY_NIT ?? '9018894798'),
  address: process.env.COMPANY_ADDRESS ?? 'CALLE 3 6 A 22 PISO 1',
  city:    'Curití, Santander',
  phone:   process.env.COMPANY_PHONE   ?? '3167760692',
  email:   process.env.COMPANY_EMAIL   ?? 'ventas@industriasmaral.com',
  website: process.env.COMPANY_WEBSITE ?? 'www.industriasmaral.com',
};

const kitComponentOverrideSchema = z.object({
  componentId: z.string().min(1),
  qty: z.number().min(0.001),
});

const quotationItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().min(0.01),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional().default(0),
  /// Componentes del kit con cantidades personalizadas (solo si el producto es kit)
  kitComponents: z.array(kitComponentOverrideSchema).optional(),
});

const quotationSchema = z.object({
  clientId: z.string().min(1, 'Cliente requerido'),
  sellerId: z.string().optional(),
  status: z.enum(['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'CONVERTIDA']).optional(),
  validityDays: z.number().int().min(1).optional().default(15),
  paymentTerms: z.string().optional().default('Contado'),
  notes: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  shippingAddress: z.string().optional(),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  items: z.array(quotationItemSchema).min(1, 'Al menos un ítem requerido'),
});

function calculateTotals(items: z.infer<typeof quotationItemSchema>[], taxPercent: number) {
  const subtotal = items.reduce((sum, item) => {
    const discounted = item.unitPrice * (1 - (item.discount || 0) / 100);
    return sum + discounted * item.qty;
  }, 0);
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// GET /api/quotations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.pageSize || req.query.limit) as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const sellerId = req.query.sellerId as string;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (search) {
      where.client = { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]};
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true, city: true } },
          seller: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({
      data: quotations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, reference: true, name: true, unit: true, warrantyYears: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    const num = String(quotation.number).padStart(5, '0');
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="COT-${num}.pdf"`);
    doc.pipe(res);

    drawQuotationPDF(doc, quotation);
    doc.end();
  } catch (error) {
    console.error('PDF quotation error:', error);
    res.status(500).json({ error: 'Error al generar PDF de cotización' });
  }
});

// GET /api/quotations/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: { id: true, reference: true, name: true, unit: true, warrantyYears: true, isKit: true },
            },
            kitComponents: {
              include: {
                component: { select: { id: true, reference: true, name: true, unit: true } },
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    res.json(quotation);
  } catch (error) {
    console.error('Get quotation error:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// POST /api/quotations
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = quotationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { items, taxPercent = 0, sellerId, followUpDate, ...rest } = validation.data;
    const effectiveSellerId = sellerId || req.user!.userId;

    const { subtotal, tax, total } = calculateTotals(items, taxPercent);

    const quotation = await prisma.quotation.create({
      data: {
        ...rest,
        sellerId: effectiveSellerId,
        subtotal,
        tax,
        total,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        items: {
          create: items.map((item) => {
            const discounted = item.unitPrice * (1 - (item.discount || 0) / 100);
            return {
              productId: item.productId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              subtotal: discounted * item.qty,
              ...(item.kitComponents && item.kitComponents.length > 0
                ? {
                    kitComponents: {
                      create: item.kitComponents.map((kc) => ({
                        componentId: kc.componentId,
                        qty: kc.qty,
                      })),
                    },
                  }
                : {}),
            };
          }),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, reference: true, name: true } } } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Quotation',
        entityId: quotation.id,
        metadata: { number: quotation.number, total },
      },
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

// PUT /api/quotations/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    const updateSchema = quotationSchema.partial();
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { items, taxPercent, followUpDate, sellerId: _sellerId, clientId: _clientId, ...rest } = validation.data;

    let totals: { subtotal: number; tax: number; total: number } | undefined;
    let itemsData: { create: Record<string, unknown>[] } | undefined;

    if (items && items.length > 0) {
      totals = calculateTotals(items, taxPercent ?? 0);
      itemsData = {
        create: items.map((item) => {
          const discounted = item.unitPrice * (1 - (item.discount || 0) / 100);
          return {
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: discounted * item.qty,
            ...(item.kitComponents && item.kitComponents.length > 0
              ? {
                  kitComponents: {
                    create: item.kitComponents.map((kc) => ({
                      componentId: kc.componentId,
                      qty: kc.qty,
                    })),
                  },
                }
              : {}),
          };
        }),
      };

    }

    const quotation = await prisma.$transaction(async (tx) => {
      if (itemsData) {
        await tx.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
      }
      return tx.quotation.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(totals || {}),
          followUpDate: followUpDate ? new Date(followUpDate) : undefined,
          ...(itemsData ? { items: itemsData } : {}),
        } as never,
        include: {
          client: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, reference: true, name: true } } } },
        },
      });
    });

    res.json(quotation);
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    if (existing.status !== 'BORRADOR') {
      res.status(400).json({ error: 'Solo se pueden eliminar cotizaciones en estado BORRADOR' });
      return;
    }

    await prisma.quotation.delete({ where: { id: req.params.id } });

    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (error) {
    console.error('Delete quotation error:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

// POST /api/quotations/:id/convert-to-order
router.post('/:id/convert-to-order', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { kitComponents: true } }, client: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    if (!['ENVIADA', 'APROBADA', 'BORRADOR'].includes(quotation.status)) {
      res.status(400).json({ error: 'No se puede convertir una cotización en este estado' });
      return;
    }

    const orderDataSchema = z.object({
      recipientName: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      phone: z.string().min(7),
      carrier: z.string().min(1),
      freightPayer: z.string().min(1),
      freightPayment: z.string().min(1),
      type: z.enum(['PEDIDO', 'GARANTIA', 'MUESTRA']).optional().default('PEDIDO'),
      notes: z.string().optional(),
    });

    const orderValidation = orderDataSchema.safeParse(req.body);
    if (!orderValidation.success) {
      res.status(400).json({
        error: 'Datos del pedido inválidos',
        details: orderValidation.error.flatten(),
      });
      return;
    }

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          quotationId: quotation.id,
          clientId: quotation.clientId,
          total: quotation.total,
          ...orderValidation.data,
          items: {
            create: quotation.items.map((item) => ({
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
      }),
      prisma.quotation.update({
        where: { id: req.params.id },
        data: { status: 'CONVERTIDA' },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CONVERT_TO_ORDER',
        entityType: 'Quotation',
        entityId: quotation.id,
        metadata: { orderId: order.id, orderNumber: order.number },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Convert to order error:', error);
    res.status(500).json({ error: 'Error al convertir cotización a pedido' });
  }
});

// ─── PDF generator ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawQuotationPDF(doc: PDFKit.PDFDocument, q: any): void {
  const ML = 50;   // left margin
  const MR = 562;  // right boundary (50 from right edge of 612pt Letter)
  const CW = 512;  // content width

  const C = {
    dark:  '#1e3a5f',
    blue:  '#2563eb',
    lgray: '#f8fafc',
    bgray: '#e2e8f0',
    tgray: '#6b7280',
    white: '#ffffff',
    black: '#111827',
    red:   '#dc2626',
  };

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const taxPct = q.subtotal > 0 ? Math.round((q.tax / q.subtotal) * 100) : 0;

  const expiry = new Date(q.createdAt);
  expiry.setDate(expiry.getDate() + q.validityDays);

  let y = 40;

  // ── HEADER ────────────────────────────────────────────────────
  //
  // Layout (612pt wide, 50pt margins each side → 512pt content):
  //   [LOGO 100pt] gap10 [COMPANY INFO 254pt] gap8 [BADGE 140pt]
  //   50           150   160                  414  422          562
  //
  const LOGO_W  = 100;
  const LOGO_H  = 70;
  const BADGE_W = 140;
  const INFO_X  = ML + LOGO_W + 10;          // 160
  const BADGE_X = MR - BADGE_W;              // 422
  const INFO_W  = BADGE_X - INFO_X - 8;      // 254

  // Logo — solid dark-blue box so it never bleeds into company text
  doc.rect(ML, y, LOGO_W, LOGO_H).fill(C.dark);
  // "M" monogram, large
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(28)
     .text('M', ML, y + 8, { width: LOGO_W, align: 'center', lineBreak: false });
  doc.fillColor('#93c5fd').font('Helvetica-Bold').fontSize(7)
     .text('MARAL', ML, y + 42, { width: LOGO_W, align: 'center', lineBreak: false });
  doc.fillColor('#93c5fd').font('Helvetica').fontSize(6)
     .text('TECNOLOGÍA', ML, y + 52, { width: LOGO_W, align: 'center', lineBreak: false });

  // Company info — starts at INFO_X, well clear of the logo box
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(10)
     .text(COMPANY.name, INFO_X, y + 4, { width: INFO_W, lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(`NIT: ${COMPANY.nit}`,                      INFO_X, y + 18, { lineBreak: false })
     .text(COMPANY.address,                             INFO_X, y + 29, { lineBreak: false })
     .text(COMPANY.city,                               INFO_X, y + 40, { lineBreak: false })
     .text(`${COMPANY.phone}   ·   ${COMPANY.email}`,  INFO_X, y + 51, { lineBreak: false })
     .text(COMPANY.website,                             INFO_X, y + 62, { lineBreak: false });

  // Badge — dark-blue box, top-right corner
  doc.rect(BADGE_X, y, BADGE_W, LOGO_H).fill(C.dark);
  const num = String(q.number).padStart(5, '0');
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
     .text('COTIZACIÓN', BADGE_X, y + 8, { width: BADGE_W, align: 'center', lineBreak: false });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20)
     .text(`# ${num}`, BADGE_X, y + 20, { width: BADGE_W, align: 'center', lineBreak: false });
  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(8)
     .text(fmtDate(q.createdAt), BADGE_X, y + 50, { width: BADGE_W, align: 'center', lineBreak: false });

  y += LOGO_H + 8;

  // Full-width rule
  doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 12;

  // ── CLIENTE + CONDICIONES (2 columns) ─────────────────────────

  const midX  = ML + Math.floor(CW / 2) - 5;  // 301
  const col2X = midX + 15;                      // 316

  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(7.5)
     .text('CLIENTE',     ML,    y, { lineBreak: false });
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(7.5)
     .text('CONDICIONES', col2X, y, { lineBreak: false });
  y += 11;

  const sectionTopY = y;
  const ROW_H = 13;

  const cl = q.client;
  const clientRows: [string, string][] = [
    ['Empresa / Razón social', cl.company || cl.name],
    ['NIT / CC',               cl.rut     || '—'],
    ['Ciudad',                 [cl.city, cl.department].filter(Boolean).join(', ') || '—'],
    ['Teléfono',               cl.phone   || '—'],
    ['Email',                  cl.email   || '—'],
  ];

  const condRows: [string, string][] = [
    ['Vigencia',          `${q.validityDays} días`],
    ['Válida hasta',      fmtDate(expiry)],
    ['Condición de pago', q.paymentTerms],
    ['IVA aplicado',      taxPct > 0 ? `${taxPct}%` : 'No aplica'],
    ['Asesor comercial',  q.seller?.name || '—'],
  ];

  const nRows = Math.max(clientRows.length, condRows.length);
  for (let i = 0; i < nRows; i++) {
    const ry = y + i * ROW_H;
    if (clientRows[i]) {
      doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
         .text(`${clientRows[i][0]}:`, ML, ry, { width: 60, lineBreak: false });
      doc.fillColor(C.black).font('Helvetica').fontSize(8)
         .text(clientRows[i][1], ML + 62, ry, { width: 225, lineBreak: false, ellipsis: true });
    }
    if (condRows[i]) {
      doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
         .text(`${condRows[i][0]}:`, col2X, ry, { width: 78, lineBreak: false });
      doc.fillColor(C.black).font('Helvetica').fontSize(8)
         .text(condRows[i][1], col2X + 80, ry, { width: MR - col2X - 80, lineBreak: false, ellipsis: true });
    }
  }

  // Vertical divider
  const sectionH = nRows * ROW_H;
  doc.moveTo(midX, sectionTopY - 4).lineTo(midX, sectionTopY + sectionH)
     .lineWidth(0.4).strokeColor(C.bgray).stroke();

  y += sectionH + 14;

  doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 10;

  // ── TABLE ─────────────────────────────────────────────────────
  // Column widths sum = 512:  22+65+165+28+38+82+36+76 = 512
  const cols = [
    { label: '#',           x: ML,       w: 22,  align: 'center' as const },
    { label: 'Referencia',  x: ML + 22,  w: 65,  align: 'left'   as const },
    { label: 'Descripción', x: ML + 87,  w: 165, align: 'left'   as const },
    { label: 'Und',         x: ML + 252, w: 28,  align: 'center' as const },
    { label: 'Cant',        x: ML + 280, w: 38,  align: 'right'  as const },
    { label: 'P. Unitario', x: ML + 318, w: 82,  align: 'right'  as const },
    { label: 'Desc%',       x: ML + 400, w: 36,  align: 'right'  as const },
    { label: 'Subtotal',    x: ML + 436, w: 76,  align: 'right'  as const },
  ];

  const HEADER_H   = 20;
  const ROW_HEIGHT = 18;

  const drawTableHeader = (headerY: number) => {
    doc.rect(ML, headerY, CW, HEADER_H).fill(C.dark);
    for (const col of cols) {
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
         .text(col.label, col.x + 3, headerY + 6,
               { width: col.w - 6, align: col.align, lineBreak: false });
    }
  };

  drawTableHeader(y);
  y += HEADER_H;

  for (let i = 0; i < q.items.length; i++) {
    if (y + ROW_HEIGHT > 710) {
      doc.addPage({ size: 'LETTER', margin: 0 });
      y = 40;
      drawTableHeader(y);
      y += HEADER_H;
    }

    const item = q.items[i];
    const prod = item.product;

    if (i % 2 === 1) {
      doc.rect(ML, y, CW, ROW_HEIGHT).fill(C.lgray);
    }

    const ty = y + 5;
    doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
       .text(String(i + 1), cols[0].x + 3, ty,
             { width: cols[0].w - 6, align: 'center', lineBreak: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(prod.reference || '—', cols[1].x + 3, ty,
             { width: cols[1].w - 6, align: 'left', lineBreak: false, ellipsis: true });
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(prod.name, cols[2].x + 3, ty,
             { width: cols[2].w - 6, align: 'left', lineBreak: false, ellipsis: true });
    doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
       .text(prod.unit || 'UN', cols[3].x + 3, ty,
             { width: cols[3].w - 6, align: 'center', lineBreak: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(item.qty % 1 === 0 ? String(item.qty) : item.qty.toFixed(2),
             cols[4].x + 3, ty,
             { width: cols[4].w - 6, align: 'right', lineBreak: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(fmtCOP(item.unitPrice), cols[5].x + 3, ty,
             { width: cols[5].w - 6, align: 'right', lineBreak: false });
    doc.fillColor(item.discount > 0 ? C.red : C.tgray).font('Helvetica').fontSize(7.5)
       .text(item.discount > 0 ? `${item.discount}%` : '—',
             cols[6].x + 3, ty,
             { width: cols[6].w - 6, align: 'right', lineBreak: false });
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(7.5)
       .text(fmtCOP(item.subtotal), cols[7].x + 3, ty,
             { width: cols[7].w - 6, align: 'right', lineBreak: false });

    doc.moveTo(ML, y + ROW_HEIGHT).lineTo(MR, y + ROW_HEIGHT)
       .lineWidth(0.3).strokeColor(C.bgray).stroke();

    y += ROW_HEIGHT;
  }

  y += 10;

  // ── TOTALS ────────────────────────────────────────────────────

  const totX = ML + 310;
  const lblW = 110;
  const valX = totX + lblW;
  const valW = MR - valX;   // 102

  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text('Subtotal:', totX, y, { width: lblW, align: 'right', lineBreak: false });
  doc.fillColor(C.black).font('Helvetica').fontSize(9)
     .text(fmtCOP(q.subtotal), valX, y, { width: valW, align: 'right', lineBreak: false });
  y += 14;

  if (q.tax > 0) {
    const taxLabel = taxPct > 0 ? `IVA (${taxPct}%):` : 'IVA:';
    doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
       .text(taxLabel, totX, y, { width: lblW, align: 'right', lineBreak: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(9)
       .text(fmtCOP(q.tax), valX, y, { width: valW, align: 'right', lineBreak: false });
    y += 14;
  }

  doc.moveTo(totX, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 5;

  doc.rect(totX - 6, y - 2, MR - totX + 6, 24).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9.5)
     .text('TOTAL:', totX, y + 5, { width: lblW, align: 'right', lineBreak: false });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
     .text(fmtCOP(q.total), valX, y + 4, { width: valW, align: 'right', lineBreak: false });

  y += 34;

  // ── NOTES ─────────────────────────────────────────────────────

  if (q.notes) {
    doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
    y += 10;
    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(7.5)
       .text('OBSERVACIONES', ML, y, { lineBreak: false });
    y += 11;
    doc.fillColor(C.black).font('Helvetica').fontSize(8.5)
       .text(q.notes, ML, y, { width: CW });
    y = doc.y + 10;
  }

  // ── FOOTER ────────────────────────────────────────────────────

  doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 10;

  const expiryLong = expiry.toLocaleDateString('es-CO',
    { day: 'numeric', month: 'long', year: 'numeric' });

  doc.fillColor(C.tgray).font('Helvetica').fontSize(8)
     .text(`Esta cotización es válida hasta el ${expiryLong}.`,
           ML, y, { width: CW, lineBreak: false });
  y += 11;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text('Este documento no constituye factura de venta.',
           ML, y, { width: CW, lineBreak: false });
  y += 11;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text(`Para confirmar su pedido comuníquese con ${q.seller?.name || 'su asesor'}` +
           (q.seller?.email ? ` — ${q.seller.email}` : ''),
           ML, y, { width: CW, lineBreak: false });
  y += 22;

  // Branding strip
  doc.rect(ML, y, CW, 18).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica').fontSize(7)
     .text(
       `${COMPANY.name}  ·  NIT ${COMPANY.nit}  ·  ${COMPANY.phone}  ·  ${COMPANY.website}`,
       ML, y + 6, { width: CW, align: 'center', lineBreak: false },
     );
  y += 18;

  // ── ETIQUETA DE ENVÍO ─────────────────────────────────────────

  drawShippingLabel(doc, q, y, ML, MR, C);
}

// ─── Shipping label ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawShippingLabel(
  doc: PDFKit.PDFDocument,
  q:   any,
  y:   number,
  ML:  number,
  MR:  number,
  C:   Record<string, string>,
): void {
  const CW = MR - ML;

  // Heights for each zone
  const REMITE_H  = 68;   // sender box
  const DEST_H    = 105;  // recipient box (NIT + city + address + phone)
  const TOTAL_H   = REMITE_H + DEST_H;

  // If less than 230pt remain on the current page, open a new one
  const PAGE_H = 792;
  const NEEDED = 32 + TOTAL_H + 20;
  if (y + NEEDED > PAGE_H - 30) {
    doc.addPage({ size: 'LETTER', margin: 0 });
    y = 40;
  } else {
    y += 22; // spacing after branding strip
  }

  // Section hint
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7)
     .text('ETIQUETA DE ENVIO — recortar y pegar en el paquete',
           ML, y, { width: CW, align: 'center', lineBreak: false });
  y += 12;

  // ── REMITE (sender) ───────────────────────────────────────────
  //  Light gray fill + dark border
  doc.rect(ML, y, CW, REMITE_H).fill(C.lgray);
  doc.rect(ML, y, CW, REMITE_H).lineWidth(1.2).strokeColor(C.dark).stroke();

  // "REMITE" pill label
  doc.rect(ML + 10, y + 8, 48, 13).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text('REMITE', ML + 10, y + 11, { width: 48, align: 'center', lineBreak: false });

  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(11)
     .text('MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S.',
           ML + 12, y + 26, { width: CW - 24, lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9.5)
     .text('Calle 3 # 6A-22 Piso 1, Curití, Santander',
           ML + 12, y + 40, { lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9.5)
     .text('Tel: 3167760692',
           ML + 12, y + 53, { lineBreak: false });

  y += REMITE_H;

  // ── CUT LINE ──────────────────────────────────────────────────
  // Centered label on a dashed rule
  const cutLabel = ' CORTAR AQUI ';
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7)
     .text(cutLabel, ML, y + 4, { width: CW, align: 'center', lineBreak: false });

  const labelApproxW = cutLabel.length * 3.8; // rough px estimate for 7pt font
  const midX = ML + CW / 2;

  // Left dash segment
  doc.moveTo(ML, y + 8)
     .lineTo(midX - labelApproxW / 2 - 4, y + 8)
     .lineWidth(0.6).strokeColor(C.tgray)
     .dash(3, { space: 3 }).stroke();
  // Right dash segment
  doc.moveTo(midX + labelApproxW / 2 + 4, y + 8)
     .lineTo(MR, y + 8)
     .dash(3, { space: 3 }).stroke();
  doc.undash();

  y += 16; // height of cut zone

  // ── DESTINO (recipient) ───────────────────────────────────────
  doc.rect(ML, y, CW, DEST_H).lineWidth(1.2).strokeColor(C.dark).stroke();

  // "DESTINO" pill label
  doc.rect(ML + 10, y + 8, 52, 13).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text('DESTINO', ML + 10, y + 11, { width: 52, align: 'center', lineBreak: false });

  const cl = q.client;
  const destName    = cl.company || cl.name || '—';
  const destNIT     = cl.rut     || '—';
  const destAddress = q.shippingAddress || cl.address || '—';
  const destCity    = [cl.city, cl.department].filter(Boolean).join(', ') || '—';
  const destPhone   = cl.phone   || '—';

  // Row layout inside DESTINO box:
  //  y+27  Company/name  — 14pt bold
  //  y+44  NIT           — 9.5pt gray
  //  y+56  Address       — 11pt
  //  y+70  City/dept     — 11pt
  //  y+84  Phone         — 10pt gray
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(14)
     .text(destName, ML + 12, y + 27, { width: CW - 24, lineBreak: false, ellipsis: true });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9.5)
     .text(`NIT / CC: ${destNIT}`, ML + 12, y + 44, { lineBreak: false });
  doc.fillColor(C.black).font('Helvetica').fontSize(11)
     .text(destAddress, ML + 12, y + 56, { width: CW - 24, lineBreak: false, ellipsis: true });
  doc.fillColor(C.black).font('Helvetica').fontSize(11)
     .text(destCity,    ML + 12, y + 70, { width: CW - 24, lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(10)
     .text(`Tel: ${destPhone}`, ML + 12, y + 84, { lineBreak: false });
}

export default router;
