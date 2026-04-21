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
  return d.length === 10 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : raw;
}
const COMPANY = {
  name:    process.env.COMPANY_NAME    ?? 'MARAL TECNOLOGÍA Y COMUNICACIONES S.A.S.',
  nit:     fmtNIT(process.env.COMPANY_NIT ?? '9018894798'),
  address: process.env.COMPANY_ADDRESS ?? 'Calle 3 # 6 A - 22 Bodega 101',
  city:    'Curití - Santander, Colombia',
  phone:   process.env.COMPANY_PHONE   ?? '3167760692',
  email:   process.env.COMPANY_EMAIL   ?? 'ventas@industriasmaral.com',
  website: process.env.COMPANY_WEBSITE ?? 'www.industriasmaral.com',
};

const SELLER_PHONES: Record<string, string> = {
  'john': '3177606126',
  'ingenieria@industriasmaral.com': '3177606126',
};

function getSellerPhone(seller: { name?: string; email?: string } | null): string {
  if (!seller) return COMPANY.phone;
  const email = (seller.email ?? '').toLowerCase();
  const name  = (seller.name  ?? '').toLowerCase();
  if (email.includes('ingenieria') || name.includes('john')) return '3177606126';
  return COMPANY.phone;
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

// GET /api/quotations/:id/html
router.get('/:id/html', async (req: AuthRequest, res: Response) => {
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
    const doc = new PDFDocument({ size: [612, 936], margin: 0 });

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
  const sellerPhone = getSellerPhone(q.seller);
  const catCode  = CATEGORY_CODES[q.client?.category ?? ''] ?? null;
  const catLabel = CATEGORY_LABELS[q.client?.category ?? ''] ?? null;
  const num = String(q.number).padStart(5, '0');
  const cl = q.client;

  // Logo base64 if exists
  let logoHtml = '';
  if (fs.existsSync(LOGO_PATH)) {
    const ext = path.extname(LOGO_PATH).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    const data = fs.readFileSync(LOGO_PATH).toString('base64');
    logoHtml = `<img src="data:${mime};base64,${data}" alt="Logo MARAL" style="max-height:70px;max-width:130px;object-fit:contain;display:block;">`;
  } else {
    logoHtml = `<div style="width:100px;height:70px;background:#1e3a5f;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:6px;gap:4px;">
      <span style="color:white;font-size:30px;font-weight:900;line-height:1;">M</span>
      <span style="color:#93c5fd;font-size:8px;letter-spacing:3px;font-weight:700;">MARAL</span>
    </div>`;
  }

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
    ['IVA aplicado', taxPct > 0 ? `${taxPct}%` : 'No aplica'],
    ['Asesor comercial', escape(q.seller?.name || '—')],
    ['Tel. asesor', escape(sellerPhone)],
  ];

  const makeInfoTable = (rows: [string, string][]) =>
    rows.map(([lbl, val]) => `
      <tr>
        <td style="color:#6b7280;font-size:11px;padding:3px 0;white-space:nowrap;vertical-align:top;">${lbl}:</td>
        <td style="padding:3px 0 3px 10px;font-size:12px;vertical-align:top;">${val}</td>
      </tr>`).join('');

  // Product rows
  const itemRows = (q.items as any[]).map((item, i: number) => {
    const prod = item.product;
    const finalPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const discStyle = item.discount > 0 ? 'color:#dc2626;font-weight:700;' : 'color:#9ca3af;';
    return `<tr style="background:${bg};">
      <td style="text-align:right;padding:7px 8px;font-weight:600;white-space:nowrap;">${item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}</td>
      <td style="padding:7px 8px;color:#4b5563;font-size:11px;white-space:nowrap;">${escape(prod.reference || '—')}</td>
      <td style="padding:7px 8px;word-break:break-word;white-space:normal;line-height:1.4;">${escape(prod.name)}</td>
      <td style="text-align:center;padding:7px 8px;color:#6b7280;white-space:nowrap;">${escape(prod.unit || 'UN')}</td>
      <td style="text-align:right;padding:7px 8px;color:#6b7280;white-space:nowrap;">${fmtCOP(item.unitPrice)}</td>
      <td style="text-align:right;padding:7px 8px;white-space:nowrap;${discStyle}">${item.discount > 0 ? item.discount + '%' : '—'}</td>
      <td style="text-align:right;padding:7px 8px;font-weight:700;white-space:nowrap;">${fmtCOP(finalPrice)}</td>
      <td style="text-align:right;padding:7px 8px;font-weight:700;white-space:nowrap;">${fmtCOP(item.subtotal)}</td>
    </tr>`;
  }).join('');

  // Shipping data
  const destCompany = escape(cl.company || cl.name || '—');
  const destContact = cl.company ? escape(cl.name) : null;
  const destNIT = escape(cl.rut || '—');
  const destAddress = escape(q.shippingAddress || cl.address || '—');
  const destCity = escape([cl.city, cl.department].filter(Boolean).join(', ') || '—');
  const destPhone = escape(cl.phone || '—');
  const destEmail = escape(cl.email || '—');

  const notesBlock = q.notes ? `
    <div style="margin-top:18px;border-left:4px solid #b45309;background:#fffbeb;padding:13px 16px;border-radius:4px;">
      <div style="color:#b45309;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">⚠ Observaciones</div>
      <div style="color:#78350f;font-size:13px;line-height:1.6;">${escape(q.notes)}</div>
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
<title>Cotización COT-${num}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:13px;background:#d1d5db;color:#111827;line-height:1.5;}
.no-print{position:fixed;top:16px;right:16px;z-index:999;display:flex;gap:8px;}
.btn{padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2);}
.btn-print{background:#1e3a5f;color:white;}
.btn-print:hover{background:#1d4ed8;}
.page{width:21cm;min-height:29.7cm;margin:20px auto;background:white;padding:1.3cm 1.5cm 1.5cm;box-shadow:0 4px 32px rgba(0,0,0,.15);border-radius:2px;}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:18px;}
.header-info{flex:1;}
.company-name{font-weight:800;color:#1e3a5f;font-size:14px;margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px;}
.company-meta{font-size:11px;color:#6b7280;line-height:1.8;}
.badge{background:#1e3a5f;color:white;padding:12px 18px;border-radius:8px;text-align:center;min-width:148px;flex-shrink:0;}
.badge-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;opacity:.75;}
.badge-number{font-size:27px;font-weight:800;margin:2px 0;letter-spacing:-.5px;}
.badge-date{font-size:10px;color:#bfdbfe;margin-top:3px;}
hr{border:none;border-top:1px solid #e5e7eb;margin:14px 0;}
.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px;}
.section-title{font-size:9.5px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #1e3a5f;}
.info-table{width:100%;border-collapse:collapse;}
table.products{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
table.products thead tr{background:#1e3a5f;}
table.products th{color:white;padding:9px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
table.products td{border-bottom:1px solid #e5e7eb;vertical-align:top;}
table.products tbody tr:last-child td{border-bottom:none;}
.totals{display:flex;justify-content:flex-end;margin-bottom:6px;}
.totals-box{width:290px;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;background:#f9fafb;}
.total-final{background:#1e3a5f;color:white;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
.signature-block{border-top:2px solid #e5e7eb;padding-top:16px;margin-top:16px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;}
.signature-left{flex:1;}
.signature-right{text-align:right;font-size:11px;color:#6b7280;line-height:1.8;}
.signature-right strong{color:#1e3a5f;display:block;}
.signature-name{font-size:16px;font-weight:800;color:#1e3a5f;margin-bottom:2px;}
.signature-line{font-size:12px;color:#374151;line-height:1.9;}
.signature-company{font-weight:700;color:#1e3a5f;}
.signature-tagline{font-style:italic;color:#9ca3af;font-size:11px;}
.strip{background:#1e3a5f;color:white;padding:8px 12px;text-align:center;font-size:10px;margin-top:18px;border-radius:4px;letter-spacing:.3px;}
/* Shipping label */
.shipping-section{margin-top:26px;padding-top:18px;border-top:2px dashed #9ca3af;}
.shipping-title{text-align:center;font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;}
.shipping-card{border:2px solid #1e3a5f;border-radius:8px;overflow:hidden;}
.remite-box{background:#f0f4f8;padding:14px 16px;}
.destino-box{padding:14px 16px;}
.sh-badge{display:inline-block;background:#1e3a5f;color:white;font-size:9px;font-weight:800;padding:3px 10px;border-radius:3px;letter-spacing:1.5px;margin-bottom:8px;text-transform:uppercase;}
.sh-company{font-size:16px;font-weight:800;color:#1e3a5f;margin-bottom:3px;word-break:break-word;}
.sh-meta{font-size:12px;color:#374151;line-height:2.1;}
.dest-company{font-size:18px;font-weight:800;color:#111827;margin-bottom:4px;word-break:break-word;}
.cut-divider{border:none;border-top:1.5px dashed #9ca3af;margin:0;}
.cut-label{text-align:center;font-size:10px;color:#9ca3af;padding:3px 0;letter-spacing:1px;background:white;}
@media print{
  body{background:white;}
  .no-print{display:none!important;}
  .page{margin:0;box-shadow:none;padding:.8cm 1cm;width:100%;}
  @page{size:A4;margin:0;}
}
</style>
</head>
<body>
<div class="no-print">
  <button class="btn btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</div>

<div class="page">
  <div class="header">
    <div style="flex-shrink:0;">${logoHtml}</div>
    <div class="header-info">
      <div class="company-name">${escape(COMPANY.name)}</div>
      <div class="company-meta">
        NIT: ${escape(COMPANY.nit)}<br>
        ${escape(COMPANY.address)}<br>
        ${escape(COMPANY.city)}<br>
        ${escape(COMPANY.phone)} &nbsp;·&nbsp; ${escape(COMPANY.email)}
      </div>
    </div>
    <div class="badge">
      <div class="badge-label">Cotización</div>
      <div class="badge-number"># ${num}</div>
      <div class="badge-date">${fmtDate(q.createdAt)}</div>
    </div>
  </div>

  <hr>

  <div class="info-grid">
    <div>
      <div class="section-title">Empresa</div>
      <table class="info-table">${makeInfoTable(empresaRows)}</table>
    </div>
    <div>
      <div class="section-title">Contacto</div>
      <table class="info-table">${makeInfoTable(contactoRows)}</table>
    </div>
    <div>
      <div class="section-title">Condiciones</div>
      <table class="info-table">${makeInfoTable(condRowPairs)}</table>
    </div>
  </div>

  <hr>

  <table class="products">
    <thead>
      <tr>
        <th style="text-align:right;width:48px;">Cant</th>
        <th style="text-align:left;width:68px;">Referencia</th>
        <th style="text-align:left;">Descripción</th>
        <th style="text-align:center;width:38px;">Und</th>
        <th style="text-align:right;width:88px;">P. Unit</th>
        <th style="text-align:right;width:44px;">Desc%</th>
        <th style="text-align:right;width:88px;">P. c/dto</th>
        <th style="text-align:right;width:88px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
        <span style="color:#6b7280;">Subtotal:</span>
        <span>${fmtCOP(q.subtotal)}</span>
      </div>
      ${taxRow}
      <div class="total-final">
        <span style="font-size:12px;font-weight:700;">TOTAL</span>
        <span style="font-size:18px;font-weight:800;">${fmtCOP(q.total)}</span>
      </div>
    </div>
  </div>

  ${notesBlock}

  <div class="signature-block">
    <div class="signature-left">
      <div class="signature-name">John Mónoga</div>
      <div class="signature-line">Gerente de Proyectos</div>
      <div class="signature-line signature-company">MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.</div>
      <div class="signature-line">ingenieria@industriasmaral.com</div>
      <div class="signature-line signature-tagline">Apoyando el mercado de las telecomunicaciones desde 2003</div>
    </div>
    <div class="signature-right">
      Esta cotización es válida hasta el<br>
      <strong>${expiryLong}</strong>
      Este documento no constituye factura de venta.
    </div>
  </div>

  <div class="strip">
    ${escape(COMPANY.address)} &nbsp;-&nbsp; ${escape(COMPANY.phone)} &nbsp;-&nbsp; ${escape(COMPANY.email)} &nbsp;-&nbsp; ${escape(COMPANY.website)} &nbsp;-&nbsp; Curití - Santander - Colombia
  </div>

  <div class="shipping-section">
    <div class="shipping-title">✂ &nbsp;Etiqueta de envío — recortar y pegar en el paquete</div>
    <div class="shipping-card">
      <div class="remite-box">
        <span class="sh-badge">Remite</span>
        <div class="sh-company">MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.</div>
        <div class="sh-meta">
          ${escape(COMPANY.nit)}<br>
          ${escape(COMPANY.address)}<br>
          ${escape(COMPANY.phone)}<br>
          ${escape(COMPANY.email)}<br>
          Curití - Santander
        </div>
      </div>
      <div class="cut-label">— — — — — — — — — — CORTAR AQUÍ — — — — — — — — — —</div>
      <hr class="cut-divider">
      <div class="destino-box">
        <span class="sh-badge">Destino</span>
        <div class="dest-company">${destCompany}</div>
        <div class="sh-meta">
          ${destNIT}<br>
          ${destAddress}<br>
          ${destPhone}<br>
          ${destEmail}<br>
          ${destCity}
        </div>
        ${destContact ? `<div style="font-size:11px;color:#6b7280;margin-top:6px;">Contacto: ${destContact}</div>` : ''}
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

  const sellerPhone = getSellerPhone(q.seller);
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
    ['Condición de pago', q.paymentTerms],
    ['IVA aplicado',      taxPct > 0 ? `${taxPct}%` : 'No aplica'],
    ['Asesor comercial',  q.seller?.name || '—'],
    ['Tel. asesor',       sellerPhone],
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

    // Calculate how many lines the description needs
    const descW = cols[2].w - 6;
    const charsPerLine = Math.floor(descW / 4.3); // ~4.3pt per char at 7.5pt
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
    // Desc — wraps instead of ellipsis
    doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
       .text(prod.name, cols[2].x + 3, ty,
             { width: descW, align: 'left', lineBreak: true });
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

  y += 34;

  // ── OBSERVACIONES (fondo dorado) ──────────────────────────────

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
     .text(`Esta cotización es válida hasta el ${expiryLong}.`,
           ML, y, { width: CW, lineBreak: false });
  y += 11;
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text('Este documento no constituye factura de venta.',
           ML, y, { width: CW, lineBreak: false });
  y += 16;

  // Bloque de firma
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(9)
     .text('John Mónoga', ML, y, { lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8)
     .text('Gerente de Proyectos', ML, y + 12, { lineBreak: false });
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(8)
     .text('MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.', ML, y + 24, { lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8)
     .text('ingenieria@industriasmaral.com', ML, y + 36, { lineBreak: false });
  doc.fillColor(C.tgray).font('Helvetica').fontSize(7.5)
     .text('Apoyando el mercado de las telecomunicaciones desde 2003', ML, y + 48, { lineBreak: false });

  y += 62;

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

  const REMITE_H  = 98;   // sender box — nombre, NIT, dirección, tel, email, ciudad
  const DEST_H    = 115;  // recipient box
  const TOTAL_H   = REMITE_H + DEST_H;

  const PAGE_H = 936;
  const NEEDED = 32 + TOTAL_H + 20;
  if (y + NEEDED > PAGE_H - 30) {
    doc.addPage({ size: [612, 936], margin: 0 });
    y = 40;
  } else {
    y += 22;
  }

  doc.fillColor(C.tgray).font('Helvetica').fontSize(7)
     .text('ETIQUETA DE ENVIO — recortar y pegar en el paquete',
           ML, y, { width: CW, align: 'center', lineBreak: false });
  y += 12;

  // ── REMITE (remitente) ────────────────────────────────────────
  doc.rect(ML, y, CW, REMITE_H).fill(C.lgray);
  doc.rect(ML, y, CW, REMITE_H).lineWidth(1.2).strokeColor(C.dark).stroke();

  doc.rect(ML + 10, y + 8, 48, 13).fill(C.dark);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text('REMITE', ML + 10, y + 11, { width: 48, align: 'center', lineBreak: false });

  const remX = ML + 12;
  const remW = CW - 24;
  const remR = ML + 10 + 48 + 8; // right of pill + gap, start second column if needed

  // Nombre
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(10)
     .text('MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.', remX, y + 26, { width: remW, lineBreak: false, ellipsis: true });
  // NIT
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.nit, remX, y + 39, { lineBreak: false });
  // Dirección
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.address, remX, y + 50, { width: remW, lineBreak: false, ellipsis: true });
  // Teléfono
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.phone, remX, y + 61, { lineBreak: false });
  // Email
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text(COMPANY.email, remX, y + 72, { width: remW, lineBreak: false, ellipsis: true });
  // Ciudad
  doc.fillColor(C.tgray).font('Helvetica').fontSize(8.5)
     .text('Curití - Santander', remX, y + 83, { lineBreak: false });

  // Unused remR — keep for potential future right-column use
  void remR;

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
  const destCompany = cl.company || cl.name || '—';
  const destNIT     = cl.rut     || '—';
  const destAddress = q.shippingAddress || cl.address || '—';
  const destPhone   = cl.phone   || '—';
  const destEmail   = cl.email   || '—';
  const destCity    = [cl.city, cl.department].filter(Boolean).join(', ') || '—';

  const dX = ML + 12;
  const dW = CW - 24;

  // Nombre — 13pt bold
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(13)
     .text(destCompany, dX, y + 27, { width: dW, lineBreak: false, ellipsis: true });

  // NIT
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(destNIT, dX, y + 43, { lineBreak: false });
  // Dirección
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(destAddress, dX, y + 55, { width: dW, lineBreak: false, ellipsis: true });
  // Teléfono
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(destPhone, dX, y + 67, { lineBreak: false });
  // Correo
  doc.fillColor(C.tgray).font('Helvetica').fontSize(9)
     .text(destEmail, dX, y + 79, { width: dW, lineBreak: false, ellipsis: true });
  // Ciudad
  doc.fillColor(C.black).font('Helvetica-Bold').fontSize(9)
     .text(destCity, dX, y + 91, { width: dW, lineBreak: false, ellipsis: true });
}

export default router;
