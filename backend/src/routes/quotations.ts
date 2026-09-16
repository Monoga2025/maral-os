import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

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
  if (d.length === 10 && !raw.includes('.')) {
    return `${d.slice(0,1)}.${d.slice(1,4)}.${d.slice(4,7)}.${d.slice(7,10)}-${raw.slice(-1)}`;
  }
  return raw;
}
const COMPANY = {
  name:      'INDUSTRIAS MARAL',
  legalName: 'INDUSTRIAS MARAL / IVAN DIAZ GONZALEZ',
  nit:       '1096.514.139',
  nitFull:   '1.096.514.139-1',
  address:   'Calle 3 # 6A- 22 Bodega 1',
  city:      'Curití - Santander',
  phone:     '3167760692',
  email:     'contabilidad@industriasmaral.com',
  website:   'www.industriasmaral.com',
};

function getSellerPhone(seller: { name?: string; email?: string; phone?: string | null } | null): string {
  if (!seller) return COMPANY.phone;
  if (seller.phone) return seller.phone;
  const email = (seller.email ?? '').toLowerCase();
  const name  = (seller.name  ?? '').toLowerCase();
  if (email.includes('ingenieria') || name.includes('john')) return '3177606126';
  return COMPANY.phone;
}

function getSellerSignature(seller: { name?: string; email?: string; title?: string | null; phone?: string | null } | null) {
  if (!seller) return { name: 'John Mónoga', title: 'Gerente de Proyectos', email: 'ingenieria@industriasmaral.com', phone: '3177606126' };
  return {
    name:  seller.name  ?? 'John Mónoga',
    title: seller.title ?? 'Asesor Comercial',
    email: seller.email ?? COMPANY.email,
    phone: getSellerPhone(seller),
  };
}

const CATEGORY_CODES: Record<string, string> = {
  IMPORTADOR:    'IM',
  DISTRIBUIDOR:  'DS',
  CLIENTE_FINAL: 'CF',
};

const CATEGORY_LABELS: Record<string, string> = {
  IMPORTADOR:    'Importador',
  DISTRIBUIDOR:  'Distribuidor',
  CLIENTE_FINAL: 'Cliente final',
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
  sourceCampaignId: z.string().optional(),
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
    const clientId = req.query.clientId as string;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (clientId) where.clientId = clientId;
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
          client: { select: { id: true, name: true, company: true, city: true, department: true, phone: true, whatsapp: true, address: true, category: true, segment: true } },
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

// GET /api/quotations/:id/html
router.get('/:id/html', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true, title: true, phone: true } },
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateQuotationHTML(quotation));
  } catch (error) {
    console.error('HTML quotation error:', error);
    res.status(500).json({ error: 'Error al generar cotización' });
  }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true, title: true, phone: true } },
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
    const rawClient = (quotation.client?.company || quotation.client?.name || 'cliente').slice(0, 40);
    const safeClient = rawClient.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
    const doc = new PDFDocument({ size: [612, 936], margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${num}_${safeClient}.pdf"`);
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
        seller: { select: { id: true, name: true, email: true, title: true, phone: true } },
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

    const { items, taxPercent = 0, sellerId, followUpDate, sourceCampaignId, ...rest } = validation.data;
    const effectiveSellerId = sellerId || req.user!.userId;

    const { subtotal, tax, total } = calculateTotals(items, taxPercent);

    // Consecutivo oficial: empieza en 650 si no hay cotizaciones superiores
    const lastQuote = await prisma.quotation.findFirst({
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNumber = Math.max((lastQuote?.number ?? 0) + 1, 650);

    const quotation = await prisma.quotation.create({
      data: {
        ...rest,
        number: nextNumber,
        sellerId: effectiveSellerId,
        subtotal,
        tax,
        total,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        sourceCampaignId: sourceCampaignId ?? null,
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

    // T4.5 — link quotation back to campaign recipient
    if (sourceCampaignId) {
      await prisma.campaignRecipient.updateMany({
        where: { clientId: quotation.clientId, campaignId: sourceCampaignId, quotationId: null },
        data: { quotationId: quotation.id, convertedAt: new Date(), status: 'CONVERTED' },
      });
    }

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

// PATCH /api/quotations/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const updated = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al cambiar estado' });
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

    if (!['BORRADOR', 'RECHAZADA'].includes(existing.status)) {
      res.status(400).json({ error: 'Solo se pueden eliminar cotizaciones en estado BORRADOR o RECHAZADA' });
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
      recipientName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      carrier: z.string().optional(),
      freightPayer: z.string().optional(),
      freightPayment: z.string().optional(),
      confirmed: z.boolean().optional(),
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

    const data = orderValidation.data;
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          quotationId: quotation.id,
          clientId: quotation.clientId,
          total: quotation.total,
          sourceCampaignId: quotation.sourceCampaignId,
          recipientName: data.recipientName || quotation.client.name,
          address: data.address || quotation.shippingAddress || quotation.client.address || '',
          city: data.city || quotation.client.city || '',
          phone: data.phone || quotation.client.phone || quotation.client.whatsapp || '',
          carrier: data.carrier || 'Cualquiera',
          freightPayer: data.freightPayer || 'Destinatario',
          freightPayment: data.freightPayment || 'Por definir',
          confirmed: data.confirmed ?? quotation.status === 'APROBADA',
          type: data.type,
          notes: data.notes,
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              unitPrice: item.unitPrice * (1 - (item.discount || 0) / 100),
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

// ─── HTML generator ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateQuotationHTML(q: any): string {
  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const expiry = new Date(q.createdAt);
  expiry.setDate(expiry.getDate() + q.validityDays);
  const expiryLong = expiry.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const taxPct = q.subtotal > 0 ? Math.round((q.tax / q.subtotal) * 100) : 0;
  const catLabel = CATEGORY_LABELS[q.client?.category ?? ''] ?? null;
  const num = String(q.number).padStart(5, '0');
  const cl = q.client;

  // Empresa column (left)
  const empresaRows: [string, string][] = [
    ['Razón Social', escape(cl.company || cl.name || '—')],
    ['NIT / CC', escape(cl.rut || '—')],
    ['Ciudad', escape([cl.city, cl.department].filter(Boolean).join(', ') || '—')],
  ];
  if (catLabel) empresaRows.push(['Categoría', escape(catLabel)]);

  // Contacto column (right)
  const contactoRows: [string, string][] = [];
  if (cl.company) contactoRows.push(['Nombre', escape(cl.name || '—')]);
  contactoRows.push(
    ['Teléfono', escape(cl.phone || '—')],
    ['Email', escape(cl.email || '—')],
  );

  const condRowPairs: [string, string][] = [
    ['Vigencia', `${q.validityDays} días`],
    ['Válida hasta', fmtDate(expiry)],
    ['Condición de pago', escape(q.paymentTerms || 'Contado')],
  ];

  // Shipping data
  const destCompany = escape(cl.company || cl.name || '—');
  const destContact = cl.company ? escape(cl.name) : null;
  const destNIT = escape(cl.rut || '—');
  const destAddress = escape(q.shippingAddress || cl.address || '—');
  const destCity = escape([cl.city, cl.department].filter(Boolean).join(', ') || '—');
  const destPhone = escape(cl.phone || '—');

  const notesBlock = q.notes ? `
    <div style="margin-top:14px;border-left:4px solid #b45309;background:#fffbeb;padding:12px 16px;border-radius:8px;">
      <div style="color:#b45309;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">⚠ Observaciones</div>
      <div style="color:#78350f;font-size:12px;line-height:1.5;">${escape(q.notes)}</div>
    </div>` : '';

  const taxRow = q.tax > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
      <span style="color:#6b7280;">IVA (${taxPct}%):</span>
      <span>${fmtCOP(q.tax)}</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cotización COT-${num} · ${destCompany}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  font-size:12px;
  background:#0B132B;
  color:#1E293B;
  line-height:1.45;
  -webkit-font-smoothing:antialiased;
  padding:24px 12px;
}
.floating-bar{
  position:fixed;
  top:18px;
  right:20px;
  z-index:999;
  display:flex;
  gap:10px;
  background:rgba(15,23,42,0.85);
  backdrop-filter:blur(12px);
  padding:8px 12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,0.15);
  box-shadow:0 10px 30px rgba(0,0,0,0.35);
}
.btn{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:8px 16px;
  border:none;
  border-radius:9px;
  cursor:pointer;
  font-size:12px;
  font-weight:700;
  font-family:'Plus Jakarta Sans',sans-serif;
  transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
  text-decoration:none;
}
.btn-print{background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#FFFFFF;box-shadow:0 3px 12px rgba(37,99,235,0.4);}
.btn-print:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,0.6);}
.btn-back{background:rgba(255,255,255,0.12);color:#F8FAFC;border:1px solid rgba(255,255,255,0.15);}
.btn-back:hover{background:rgba(255,255,255,0.22);color:#FFFFFF;}

.sheet{
  width:21.5cm;
  min-height:28cm;
  margin:0 auto 30px;
  background:#FFFFFF;
  padding:32px 38px;
  border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1);
  position:relative;
}
.sheet-shipping{
  page-break-before:always;
  break-before:page;
}

/* Header */
.top-header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:20px;
  padding-bottom:18px;
  border-bottom:2px solid #F1F5F9;
}
.brand-block{
  display:flex;
  align-items:center;
  gap:14px;
}
.logo-box{
  width:50px;
  height:50px;
  border-radius:12px;
  background:linear-gradient(135deg,#0F172A,#1E293B);
  display:flex;
  align-items:center;
  justify-content:center;
  color:#38BDF8;
  box-shadow:0 4px 14px rgba(15,23,42,0.2);
}
.brand-name{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:15px;
  font-weight:800;
  color:#0F172A;
  letter-spacing:-0.3px;
  text-transform:uppercase;
}
.brand-meta{
  font-size:10.5px;
  color:#64748B;
  margin-top:2px;
  line-height:1.5;
}

.badge-box{
  background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);
  color:#FFFFFF;
  padding:12px 18px;
  border-radius:12px;
  text-align:right;
  min-width:175px;
  box-shadow:0 6px 18px rgba(15,23,42,0.18);
  border:1px solid rgba(255,255,255,0.08);
}
.badge-tag{
  font-size:9px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:1.6px;
  color:#38BDF8;
}
.badge-number{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:22px;
  font-weight:800;
  color:#FFFFFF;
  letter-spacing:-0.5px;
  margin:2px 0;
}
.badge-date{
  font-size:10px;
  color:#94A3B8;
  font-weight:500;
}

/* Bento Grid */
.bento-grid{
  display:grid;
  grid-template-columns:1.1fr 1.1fr 0.95fr;
  gap:12px;
  margin:16px 0;
}
.bento-card{
  background:#F8FAFC;
  border:1px solid #E2E8F0;
  border-radius:10px;
  padding:12px 14px;
}
.bento-title{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:9px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#0284C7;
  margin-bottom:8px;
  display:flex;
  align-items:center;
  gap:5px;
}
.bento-title::before{
  content:'';
  display:inline-block;
  width:5px;
  height:5px;
  border-radius:50%;
  background:#0284C7;
}
.bento-table{width:100%;border-collapse:collapse;}
.bento-label{
  color:#64748B;
  font-size:10.5px;
  padding:2px 0;
  white-space:nowrap;
  vertical-align:top;
  font-weight:500;
}
.bento-value{
  padding:2px 0 2px 6px;
  font-size:11px;
  color:#0F172A;
  font-weight:600;
  vertical-align:top;
}

/* Products Table */
.table-wrap{
  border:1px solid #E2E8F0;
  border-radius:10px;
  overflow:hidden;
  margin:16px 0 12px;
}
table.products{
  width:100%;
  border-collapse:collapse;
  font-size:11px;
}
table.products thead th{
  background:#0F172A;
  color:#F8FAFC;
  padding:8px 10px;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:9px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:0.8px;
}
table.products tbody td{
  padding:7px 10px;
  border-bottom:1px solid #F1F5F9;
  vertical-align:middle;
  color:#334155;
}
table.products tbody tr:last-child td{border-bottom:none;}
table.products tbody tr:nth-child(even){background:#F8FAFC;}
.ref-pill{
  display:inline-block;
  font-family:monospace;
  font-size:10px;
  font-weight:700;
  background:#EFF6FF;
  color:#1D4ED8;
  padding:1px 5px;
  border-radius:4px;
  border:1px solid #DBEAFE;
}
.disc-pill{
  display:inline-block;
  font-size:9.5px;
  font-weight:700;
  background:#FEF2F2;
  color:#DC2626;
  padding:1px 4px;
  border-radius:4px;
}

/* Totals Box */
.summary-container{
  display:flex;
  justify-content:flex-end;
  margin-top:4px;
}
.summary-box{
  width:300px;
  background:#F8FAFC;
  border:1px solid #E2E8F0;
  border-radius:12px;
  padding:12px 16px;
}
.summary-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:3px 0;
  font-size:11.5px;
  color:#64748B;
  font-weight:500;
}
.summary-row.bold{
  color:#0F172A;
  font-weight:700;
}
.summary-total{
  background:linear-gradient(135deg,#0F172A,#1E293B);
  color:#FFFFFF;
  margin-top:8px;
  padding:10px 12px;
  border-radius:8px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  box-shadow:0 4px 12px rgba(15,23,42,0.15);
}
.total-label{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:10.5px;
  font-weight:800;
  letter-spacing:1px;
  text-transform:uppercase;
  color:#38BDF8;
}
.total-amount{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:18px;
  font-weight:800;
  color:#FFFFFF;
  letter-spacing:-0.5px;
}

/* Notice Box */
.notice-box{
  margin-top:14px;
  background:#EFF6FF;
  border:1px solid #BFDBFE;
  border-left:4px solid #2563EB;
  padding:12px 16px;
  border-radius:10px;
}
.notice-title{
  color:#1E40AF;
  font-weight:800;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:1.2px;
  margin-bottom:5px;
}
.notice-text{
  color:#1E3A8A;
  font-size:11px;
  line-height:1.55;
}
.bank-pill{
  margin-top:8px;
  display:inline-block;
  background:#FFFFFF;
  border:1px solid #93C5FD;
  border-radius:6px;
  padding:6px 12px;
  color:#0F172A;
  font-size:11px;
}

/* Signature & Guarantees */
.signature-section{
  margin-top:18px;
  padding-top:14px;
  border-top:1px solid #E2E8F0;
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:20px;
}
.sig-card{flex:1;}
.sig-name{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:14px;
  font-weight:800;
  color:#0F172A;
}
.sig-role{
  font-size:10.5px;
  color:#64748B;
  font-weight:600;
  margin-top:2px;
}
.sig-guarantee{
  font-size:9.5px;
  color:#059669;
  font-weight:600;
  background:#ECFDF5;
  border:1px solid #A7F3D0;
  display:inline-block;
  padding:2px 6px;
  border-radius:5px;
  margin-top:5px;
}
.sig-right{
  text-align:right;
  font-size:10px;
  color:#64748B;
  line-height:1.6;
}
.sig-right strong{
  color:#0F172A;
  font-weight:700;
}

/* Shipping Page 2 */
.shipping-block{
  margin-top:20px;
}
.cut-tag{
  text-align:center;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:9px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:1.6px;
  color:#64748B;
  margin-bottom:12px;
}
.shipping-container{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  border:2px solid #0F172A;
  border-radius:12px;
  overflow:hidden;
  background:#FFFFFF;
}
.sh-box{
  padding:16px 18px;
}
.sh-remite{
  background:#F1F5F9;
  border-right:1px solid #CBD5E1;
}
.sh-pill{
  display:inline-block;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:9px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:1.5px;
  padding:3px 8px;
  border-radius:5px;
  margin-bottom:8px;
}
.sh-pill.rem{background:#0F172A;color:#FFFFFF;}
.sh-pill.dest{background:#0284C7;color:#FFFFFF;}
.sh-name{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:14px;
  font-weight:800;
  color:#0F172A;
  margin-bottom:4px;
}
.sh-details{
  font-size:11px;
  color:#334155;
  line-height:1.7;
}

@media print{
  body{background:#FFFFFF;padding:0;}
  .floating-bar{display:none!important;}
  .sheet{
    box-shadow:none;
    padding:20px 24px;
    width:100%;
    margin:0;
    border-radius:0;
    min-height:auto;
  }
  .sheet-shipping{
    page-break-before:always!important;
    break-before:page!important;
    padding-top:24px;
  }
  @page{size:letter;margin:1cm 1.2cm;}
}
</style>
</head>
<body>

<div class="floating-bar">
  <a href="/cotizaciones" class="btn btn-back">← Volver</a>
  <button class="btn btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</div>

<!-- HOJA 1: COTIZACIÓN COMERCIAL -->
<div class="sheet">
  <!-- Header -->
  <div class="top-header">
    <div class="brand-block">
      <div class="logo-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
          <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">${escape(COMPANY.name)}</div>
        <div class="brand-meta">
          <strong>NIT:</strong> ${escape(COMPANY.nit)} &nbsp;·&nbsp; ${escape(COMPANY.city)}<br>
          ${escape(COMPANY.address)} &nbsp;·&nbsp; <strong>Cel / WhatsApp:</strong> ${escape(COMPANY.phone)}<br>
          <strong>Email:</strong> ${escape(COMPANY.email)} &nbsp;·&nbsp; ${escape(COMPANY.website)}
        </div>
      </div>
    </div>
    <div class="badge-box">
      <div class="badge-tag">Cotización Oficial</div>
      <div class="badge-number">COT-${num}</div>
      <div class="badge-date">Fecha: ${fmtDate(q.createdAt)}</div>
    </div>
  </div>

  <!-- Bento Grid Info -->
  <div class="bento-grid">
    <div class="bento-card">
      <div class="bento-title">Cliente / Razón Social</div>
      <table class="bento-table">
        ${empresaRows.map(([lbl, val]) => `
          <tr>
            <td class="bento-label">${lbl}:</td>
            <td class="bento-value">${val}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="bento-card">
      <div class="bento-title">Contacto & Envío</div>
      <table class="bento-table">
        ${contactoRows.map(([lbl, val]) => `
          <tr>
            <td class="bento-label">${lbl}:</td>
            <td class="bento-value">${val}</td>
          </tr>
        `).join('')}
        <tr>
          <td class="bento-label">Dirección:</td>
          <td class="bento-value">${destAddress}</td>
        </tr>
      </table>
    </div>

    <div class="bento-card">
      <div class="bento-title">Condiciones Comerciales</div>
      <table class="bento-table">
        ${condRowPairs.map(([lbl, val]) => `
          <tr>
            <td class="bento-label">${lbl}:</td>
            <td class="bento-value">${val}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  </div>

  <!-- Product Table -->
  <div class="table-wrap">
    <table class="products">
      <thead>
        <tr>
          <th style="text-align:right;width:44px;">Cant</th>
          <th style="text-align:left;width:95px;">Referencia</th>
          <th style="text-align:left;">Descripción del Producto</th>
          <th style="text-align:center;width:44px;">Und</th>
          <th style="text-align:right;width:90px;">P. Lista</th>
          <th style="text-align:center;width:55px;">Dcto</th>
          <th style="text-align:right;width:90px;">P. Unit</th>
          <th style="text-align:right;width:105px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${(q.items as any[]).map((item) => {
          const prod = item.product;
          const finalPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
          return `<tr>
            <td style="text-align:right;font-weight:700;color:#0F172A;">${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}</td>
            <td><span class="ref-pill">${escape(prod.reference || '—')}</span></td>
            <td style="font-weight:600;color:#0F172A;line-height:1.4;">${escape(prod.name)}</td>
            <td style="text-align:center;color:#64748B;font-size:10.5px;">${escape(prod.unit || 'UND')}</td>
            <td style="text-align:right;color:#64748B;">${fmtCOP(item.unitPrice)}</td>
            <td style="text-align:center;">${item.discount > 0 ? `<span class="disc-pill">-${item.discount}%</span>` : '<span style="color:#CBD5E1;">0%</span>'}</td>
            <td style="text-align:right;font-weight:600;color:#0F172A;">${fmtCOP(finalPrice)}</td>
            <td style="text-align:right;font-weight:800;color:#0F172A;">${fmtCOP(item.subtotal)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Financial Summary -->
  <div class="summary-container">
    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal Bruto:</span>
        <span class="summary-row bold">${fmtCOP(q.subtotal)}</span>
      </div>
      ${taxRow}
      <div class="summary-total">
        <div>
          <div class="total-label">Total Propuesta</div>
          <div style="font-size:9px;color:#94A3B8;margin-top:1px;">Moneda: Pesos Colombianos (COP)</div>
        </div>
        <div class="total-amount">${fmtCOP(q.total)}</div>
      </div>
    </div>
  </div>

  <!-- Aviso de Cambio de Razón Social y Datos Bancarios -->
  <div class="notice-box">
    <div class="notice-title">📢 Información Importante / Cambio de Razón Social y Datos Bancarios</div>
    <div class="notice-text">
      Queremos informarte que cambiamos de razón social y, a partir de ahora, operaremos bajo el nombre de <strong>INDUSTRIAS MARAL / IVAN DIAZ GONZALEZ</strong>, identificado con el <strong>NIT 1.096.514.139-1</strong>.<br>
      Actualmente pertenecemos al régimen de no responsable del IVA, por lo que nuestras ventas no generan este impuesto.<br>
      La cuenta anterior ya no corresponde, por lo que te agradecemos <strong>utilizar los nuevos datos bancarios</strong> que encontrarás a continuación:
    </div>
    <div class="bank-pill">
      <span style="font-weight:800;color:#1D4ED8;">BANCOLOMBIA</span> &nbsp;·&nbsp;
      <strong>CTA ahorros:</strong> <code>32200043676</code> &nbsp;·&nbsp;
      <strong>Titular:</strong> Ivan Camilo Diaz G.
    </div>
  </div>

  ${notesBlock}

  <!-- Signatures -->
  <div class="signature-section">
    <div class="sig-card">
      <div class="sig-name">MARAL TECNOLOGÍA</div>
      <div class="sig-role">Apoyando el mercado de las telecomunicaciones desde 2003</div>
      <div class="sig-guarantee">✓ Garantía directa de fábrica MARAL · Industria Colombiana desde 2003</div>
    </div>
    <div class="sig-right">
      Propuesta comercial válida por ${q.validityDays} días calendario<br>
      Fecha límite de validez: <strong>${expiryLong}</strong><br>
      <em>Fabricación y despachos nacionales desde Curití, Santander</em>
    </div>
  </div>
</div>

<!-- HOJA 2: RÓTULO DE DESPACHO LOGÍSTICO -->
<div class="sheet sheet-shipping">
  <div class="top-header">
    <div class="brand-block">
      <div class="logo-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
          <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">${escape(COMPANY.name)}</div>
        <div class="brand-meta">
          <strong>NIT:</strong> ${escape(COMPANY.nit)} &nbsp;·&nbsp; ${escape(COMPANY.city)}<br>
          ${escape(COMPANY.address)} &nbsp;·&nbsp; <strong>Cel:</strong> ${escape(COMPANY.phone)}
        </div>
      </div>
    </div>
    <div class="badge-box">
      <div class="badge-tag">Rótulo de Envío</div>
      <div class="badge-number">COT-${num}</div>
      <div class="badge-date">Despacho Logístico</div>
    </div>
  </div>

  <div class="shipping-block">
    <div class="cut-tag">✂ &nbsp;Rótulo de Despacho Logístico (Recortar y fijar en el paquete)</div>
    <div class="shipping-container">
      <div class="sh-box sh-remite">
        <span class="sh-pill rem">Remitente</span>
        <div class="sh-name">${escape(COMPANY.name)}</div>
        <div class="sh-details">
          <strong>NIT:</strong> ${escape(COMPANY.nit)}<br>
          <strong>Dirección:</strong> ${escape(COMPANY.address)}<br>
          <strong>Ciudad:</strong> ${escape(COMPANY.city)}<br>
          <strong>Teléfono:</strong> ${escape(COMPANY.phone)}
        </div>
      </div>
      <div class="sh-box">
        <span class="sh-pill dest">Destinatario</span>
        <div class="sh-name">${destCompany}</div>
        <div class="sh-details">
          ${destContact ? `<strong>Atención:</strong> ${destContact}<br>` : ''}
          <strong>NIT / Cédula:</strong> ${destNIT}<br>
          <strong>Dirección de Entrega:</strong> ${destAddress}<br>
          <strong>Ciudad / Depto:</strong> ${destCity}<br>
          <strong>Teléfono Contacto:</strong> ${destPhone}
        </div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

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
    gold:  '#b45309',
    goldBg:'#fffbeb',
  };

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const taxPct = q.subtotal > 0 ? Math.round((q.tax / q.subtotal) * 100) : 0;

  const expiry = new Date(q.createdAt);
  expiry.setDate(expiry.getDate() + q.validityDays);

  const catCode = CATEGORY_CODES[q.client?.category ?? ''] ?? null;

  let y = 40;

  // ── HEADER ────────────────────────────────────────────────────
  const LOGO_W  = 100;
  const LOGO_H  = 70;
  const BADGE_W = 140;
  const INFO_X  = ML + LOGO_W + 10;     // 160
  const BADGE_X = MR - BADGE_W;         // 422
  const INFO_W  = BADGE_X - INFO_X - 8; // 254

  // Logo — carga PNG si existe, placeholder si no
  if (fs.existsSync(LOGO_PATH)) {
    doc.rect(ML, y, LOGO_W, LOGO_H).fill('#ffffff');
    doc.image(LOGO_PATH, ML, y + 5, { fit: [LOGO_W, LOGO_H - 10], align: 'center', valign: 'center' });
  } else {
    doc.rect(ML, y, LOGO_W, LOGO_H).fill(C.dark);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(28)
       .text('M', ML, y + 8, { width: LOGO_W, align: 'center', lineBreak: false });
    doc.fillColor('#93c5fd').font('Helvetica-Bold').fontSize(7)
       .text('MARAL', ML, y + 42, { width: LOGO_W, align: 'center', lineBreak: false });
    doc.fillColor('#93c5fd').font('Helvetica').fontSize(6)
       .text('TECNOLOGÍA', ML, y + 52, { width: LOGO_W, align: 'center', lineBreak: false });
  }

  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(10)
     .text(COMPANY.name, INFO_X, y + 4, { width: INFO_W, lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(`NIT: ${COMPANY.nit}`,                     INFO_X, y + 18, { lineBreak: false })
     .text(COMPANY.address,                            INFO_X, y + 29, { lineBreak: false })
     .text(COMPANY.city,                               INFO_X, y + 40, { lineBreak: false })
     .text(`${COMPANY.phone}   ·   ${COMPANY.email}`, INFO_X, y + 51, { lineBreak: false })
     .text(COMPANY.website,                            INFO_X, y + 62, { lineBreak: false });

  doc.rect(BADGE_X, y, BADGE_W, LOGO_H).fill(C.dark);
  const num = String(q.number).padStart(5, '0');
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
     .text('COTIZACIÓN', BADGE_X, y + 8, { width: BADGE_W, align: 'center', lineBreak: false });
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20)
     .text(`# ${num}`, BADGE_X, y + 20, { width: BADGE_W, align: 'center', lineBreak: false });
  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(8)
     .text(fmtDate(q.createdAt), BADGE_X, y + 50, { width: BADGE_W, align: 'center', lineBreak: false });

  y += LOGO_H + 8;

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
  ];
  if (cl.company) {
    clientRows.push(['Contacto', cl.name]);
  }
  if (catCode) {
    clientRows.push(['Categoría', catCode]);
  }
  clientRows.push(
    ['NIT / CC',  cl.rut || '—'],
    ['Ciudad',    [cl.city, cl.department].filter(Boolean).join(', ') || '—'],
    ['Teléfono',  cl.phone || '—'],
    ['Email',     cl.email || '—'],
  );

  const condRows: [string, string][] = [
    ['Vigencia',          `${q.validityDays} días`],
    ['Válida hasta',      fmtDate(expiry)],
    ['Condición de pago', q.paymentTerms || 'Contado'],
  ];

  const nRows = Math.max(clientRows.length, condRows.length);
  for (let i = 0; i < nRows; i++) {
    const ry = y + i * ROW_H;
    if (clientRows[i]) {
      doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
         .text(`${clientRows[i][0]}:`, ML, ry, { width: 65, lineBreak: false });
      doc.fillColor(C.black).font('Helvetica').fontSize(8)
         .text(clientRows[i][1], ML + 67, ry, { width: 220, lineBreak: false, ellipsis: true });
    }
    if (condRows[i]) {
      doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
         .text(`${condRows[i][0]}:`, col2X, ry, { width: 78, lineBreak: false });
      doc.fillColor(C.black).font('Helvetica').fontSize(8)
         .text(condRows[i][1], col2X + 80, ry, { width: MR - col2X - 80, lineBreak: false, ellipsis: true });
    }
  }

  const sectionH = nRows * ROW_H;
  doc.moveTo(midX, sectionTopY - 4).lineTo(midX, sectionTopY + sectionH)
     .lineWidth(0.4).strokeColor(C.bgray).stroke();

  y += sectionH + 14;

  doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 10;

  // ── TABLE ─────────────────────────────────────────────────────
  // Cols sum=512: Cant(38)+Ref(55)+Desc(162)+Und(26)+P.Unit(76)+Desc%(32)+P.c/dto(75)+Subtotal(48)
  const cols = [
    { label: 'Cant',       x: ML,       w: 38,  align: 'right'  as const },
    { label: 'Referencia', x: ML + 38,  w: 55,  align: 'left'   as const },
    { label: 'Descripción',x: ML + 93,  w: 162, align: 'left'   as const },
    { label: 'Und',        x: ML + 255, w: 26,  align: 'center' as const },
    { label: 'P. Unit',    x: ML + 281, w: 76,  align: 'right'  as const },
    { label: 'Desc%',      x: ML + 357, w: 32,  align: 'right'  as const },
    { label: 'P. c/dto',   x: ML + 389, w: 75,  align: 'right'  as const },
    { label: 'Subtotal',   x: ML + 464, w: 48,  align: 'right'  as const },
  ];

  const HEADER_H   = 20;
  const MIN_ROW_H  = 18;

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
    const item = q.items[i];
    const prod = item.product;
    const finalPrice = item.unitPrice * (1 - (item.discount || 0) / 100);

    const descW = cols[2].w - 6;
    const charsPerLine = Math.floor(descW / 4.0);
    const descLines = Math.ceil(prod.name.length / charsPerLine);
    const ROW_HEIGHT = Math.max(MIN_ROW_H, descLines * 10 + 8);

    if (y + ROW_HEIGHT > 870) {
      doc.addPage({ size: [612, 936], margin: 0 });
      y = 40;
      drawTableHeader(y);
      y += HEADER_H;
    }

    if (i % 2 === 1) {
      doc.rect(ML, y, CW, ROW_HEIGHT).fill(C.lgray);
    }

    const ty = y + 5;
    // Cant
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(7.5)
       .text(item.qty % 1 === 0 ? String(item.qty) : item.qty.toFixed(2),
             cols[0].x + 3, ty, { width: cols[0].w - 6, align: 'right', lineBreak: false });
    // Ref
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(prod.reference || '—', cols[1].x + 3, ty,
             { width: cols[1].w - 6, align: 'left', lineBreak: false, ellipsis: true });
    // Desc
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(prod.name, cols[2].x + 3, ty,
             { width: descW, align: 'left', lineBreak: true, height: ROW_HEIGHT - 8 });
    // Und
    doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
       .text(prod.unit || 'UN', cols[3].x + 3, ty,
             { width: cols[3].w - 6, align: 'center', lineBreak: false });
    // P. Unit
    doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
       .text(fmtCOP(item.unitPrice), cols[4].x + 3, ty,
             { width: cols[4].w - 6, align: 'right', lineBreak: false });
    // Desc%
    doc.fillColor(item.discount > 0 ? C.red : C.tgray).font('Helvetica').fontSize(7.5)
       .text(item.discount > 0 ? `${item.discount}%` : '—',
             cols[5].x + 3, ty, { width: cols[5].w - 6, align: 'right', lineBreak: false });
    // P. c/dto
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(7.5)
       .text(fmtCOP(finalPrice), cols[6].x + 3, ty,
             { width: cols[6].w - 6, align: 'right', lineBreak: false });
    // Subtotal
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
  const valW = MR - valX;

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

  y += 32;

  // ── AVISO DE CAMBIO DE RAZON SOCIAL & BANCOLOMBIA ─────────────
  doc.rect(ML, y, CW, 50).fill('#EFF6FF');
  doc.rect(ML, y, CW, 50).lineWidth(0.8).strokeColor('#BFDBFE').stroke();
  doc.rect(ML, y, 4, 50).fill(C.blue);

  doc.fillColor(C.blue).font('Helvetica-Bold').fontSize(7.5)
     .text('AVISO IMPORTANTE / CAMBIO DE RAZON SOCIAL Y DATOS BANCARIOS', ML + 10, y + 6, { lineBreak: false });

  doc.fillColor('#1E3A8A').font('Helvetica').fontSize(7)
     .text('Operamos bajo el nombre INDUSTRIAS MARAL / IVAN DIAZ GONZALEZ (NIT 1.096.514.139-1). Régimen no responsable de IVA.', ML + 10, y + 17, { width: CW - 20 })
     .text('BANCOLOMBIA  ·  CTA Ahorros: 32200043676  ·  Titular: Ivan Camilo Diaz G.', ML + 10, y + 34, { width: CW - 20 });

  y += 58;

  // ── OBSERVACIONES ─────────────────────────────────────────────
  if (q.notes) {
    doc.rect(ML, y, CW, 4).fill(C.gold);
    y += 8;
    doc.fillColor(C.gold).font('Helvetica-Bold').fontSize(7.5)
       .text('OBSERVACIONES', ML, y, { lineBreak: false });
    y += 11;
    doc.rect(ML, y - 3, CW, 1).fill('#fde68a');
    doc.fillColor('#78350f').font('Helvetica').fontSize(8.5)
       .text(q.notes, ML, y, { width: CW });
    y = doc.y + 10;
  }

  // ── FOOTER ────────────────────────────────────────────────────
  doc.moveTo(ML, y).lineTo(MR, y).lineWidth(0.5).strokeColor(C.bgray).stroke();
  y += 10;

  const expiryLong = expiry.toLocaleDateString('es-CO',
    { day: 'numeric', month: 'long', year: 'numeric' });

  doc.fillColor(C.tgray).font('Helvetica').fontSize(8)
     .text(`Documento oficial de cotización válida por ${q.validityDays} días — hasta el ${expiryLong}.`,
           ML, y, { width: CW, lineBreak: false });
  y += 11;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text('Este documento no constituye factura de venta. La factura será emitida en el momento de la confirmación del pedido.',
           ML, y, { width: CW, lineBreak: false });
  y += 16;

  // Bloque de firma — MARAL TECNOLOGÍA
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(10)
     .text('MARAL TECNOLOGÍA', ML, y, { lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8)
     .text('Apoyando el mercado de las telecomunicaciones desde 2003', ML, y + 13, { lineBreak: false });

  y += 36;

  // Branding strip
  doc.rect(ML, y, CW, 18).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica').fontSize(7)
     .text(
       `${COMPANY.name}  ·  NIT ${COMPANY.nit}  ·  ${COMPANY.phone}  ·  ${COMPANY.website}`,
       ML, y + 6, { width: CW, align: 'center', lineBreak: false },
     );
  y += 18;

  // ── HOJA 2: ETIQUETA DE ENVÍO ─────────────────────────────────
  drawShippingLabel(doc, q, y, ML, MR, C);
}

// ─── Shipping label (Hoja 2) ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawShippingLabel(
  doc: PDFKit.PDFDocument,
  q:   any,
  _y:  number,
  ML:  number,
  MR:  number,
  C:   Record<string, string>,
): void {
  const CW = MR - ML;
  const REMITE_H  = 98;
  const DEST_H    = 115;

  // Siempre en Hoja 2 independiente
  doc.addPage({ size: [612, 936], margin: 0 });
  let y = 40;

  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(12)
     .text('RÓTULO DE DESPACHO LOGÍSTICO', ML, y, { width: CW, align: 'center', lineBreak: false });
  y += 16;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text('Recortar y fijar en la caja o paquete de envío',
           ML, y, { width: CW, align: 'center', lineBreak: false });
  y += 16;

  // ── REMITE (remitente) ────────────────────────────────────────
  doc.rect(ML, y, CW, REMITE_H).fill(C.lgray);
  doc.rect(ML, y, CW, REMITE_H).lineWidth(1.2).strokeColor(C.dark).stroke();

  doc.rect(ML + 10, y + 8, 48, 13).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text('REMITE', ML + 10, y + 11, { width: 48, align: 'center', lineBreak: false });

  const remX = ML + 12;
  const remW = CW - 24;

  // Nombre
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(10)
     .text(COMPANY.name, remX, y + 26, { width: remW, lineBreak: false, ellipsis: true });
  // NIT
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(`NIT: ${COMPANY.nit}`, remX, y + 39, { lineBreak: false });
  // Dirección
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.address, remX, y + 50, { width: remW, lineBreak: false, ellipsis: true });
  // Teléfono
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(`Tel: ${COMPANY.phone}`, remX, y + 61, { lineBreak: false });
  // Ciudad
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.city, remX, y + 72, { lineBreak: false });

  y += REMITE_H;

  // ── CUT LINE ──────────────────────────────────────────────────
  const cutLabel = ' CORTAR AQUI ';
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7)
     .text(cutLabel, ML, y + 4, { width: CW, align: 'center', lineBreak: false });

  const labelApproxW = cutLabel.length * 3.8;
  const midX = ML + CW / 2;

  doc.moveTo(ML, y + 8)
     .lineTo(midX - labelApproxW / 2 - 4, y + 8)
     .lineWidth(0.6).strokeColor(C.tgray)
     .dash(3, { space: 3 }).stroke();
  doc.moveTo(midX + labelApproxW / 2 + 4, y + 8)
     .lineTo(MR, y + 8)
     .dash(3, { space: 3 }).stroke();
  doc.undash();

  y += 16;

  // ── DESTINO (destinatario) ────────────────────────────────────
  doc.rect(ML, y, CW, DEST_H).lineWidth(1.2).strokeColor(C.dark).stroke();

  doc.rect(ML + 10, y + 8, 52, 13).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text('DESTINO', ML + 10, y + 11, { width: 52, align: 'center', lineBreak: false });

  const cl = q.client;
  const destContact2 = cl.company ? cl.name || null : null;
  const destCompany  = cl.company || cl.name || '—';
  const destNIT     = cl.rut     || '—';
  const destAddress = q.shippingAddress || cl.address || '—';
  const destPhone   = cl.phone   || '—';
  const destCity    = [cl.city, cl.department].filter(Boolean).join(', ') || '—';

  const dX = ML + 12;
  const dW = CW - 24;

  let dY = y + 24;

  if (destContact2) {
    doc.fillColor(C.black).font('Helvetica-Bold').fontSize(9)
       .text(destContact2, dX, dY, { width: dW, lineBreak: false, ellipsis: true });
    dY += 13;
  }

  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(13)
     .text(destCompany, dX, dY, { width: dW, lineBreak: false, ellipsis: true });
  dY += 18;

  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(`NIT / CC: ${destNIT}`, dX, dY, { lineBreak: false });
  dY += 12;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(`Dirección: ${destAddress}`, dX, dY, { width: dW, lineBreak: false, ellipsis: true });
  dY += 12;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(`Teléfono: ${destPhone}`, dX, dY, { lineBreak: false });
  dY += 12;
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(9)
     .text(`Ciudad / Depto: ${destCity}`, dX, dY, { width: dW, lineBreak: false, ellipsis: true });
}

// POST /api/quotations/:id/production-order — crea OPs desde cotización
router.post('/:id/production-order', async (req: AuthRequest, res: Response) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!quotation) { res.status(404).json({ error: 'Cotización no encontrada' }); return; }

    const schema = z.object({
      items: z.array(z.object({
        productId: z.string(),
        qty: z.number().positive(),
        notes: z.string().optional(),
        assignedTo: z.string().optional(),
        requiredDate: z.string().optional(),
      })).min(1, 'Selecciona al menos un ítem'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
      return;
    }

    const created = await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.productionOrder.create({
          data: {
            productId: item.productId,
            qty: item.qty,
            notes: item.notes,
            assignedTo: item.assignedTo || null,
            requiredDate: item.requiredDate ? new Date(item.requiredDate) : null,
          },
          include: { product: { select: { id: true, name: true, reference: true } } },
        })
      )
    );

    res.status(201).json({ productionOrders: created });
  } catch (error) {
    console.error('Create production order from quotation error:', error);
    res.status(500).json({ error: 'Error al crear órdenes de producción' });
  }
});

export default router;
