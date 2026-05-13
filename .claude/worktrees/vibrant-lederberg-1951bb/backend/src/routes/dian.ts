import { Router, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  buildDIANInvoiceData,
  calculateCUFE,
  generateUBLXML,
  saveUBLXML,
  sendToDIAN,
  wrapInSOAPEnvelope,
  type DIANConfig,
} from '../lib/dian';

const router = Router();
router.use(authenticate);

const UBL_DIR = process.env.UBL_DIR || path.join(process.cwd(), 'ubl');

// ── Leer configuración DIAN desde BD o env ────────────────────

async function getDIANConfig(): Promise<DIANConfig | null> {
  try {
    const cfg = await prisma.dIANConfiguration.findFirst();
    if (!cfg) {
      // Fallback: leer de variables de entorno (modo desarrollo)
      if (!process.env.DIAN_NIT) return null;
      return envConfig();
    }
    return {
      nit: cfg.companyNIT.replace(/\D/g, ''),
      digitoVerificacion: cfg.companyNIT.split('-')[1] || '0',
      nombre: process.env.COMPANY_NAME ?? 'MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.',
      address: process.env.COMPANY_ADDRESS ?? 'Calle 3 # 6A-22 Bodega 101',
      city: 'Curití',
      department: 'Santander',
      phone: process.env.COMPANY_PHONE ?? '3167760692',
      email: process.env.COMPANY_EMAIL ?? 'ventas@industriasmaral.com',
      softwareId: cfg.softwareId ?? process.env.DIAN_SOFTWARE_ID ?? '',
      softwarePin: cfg.softwarePin ?? process.env.DIAN_SOFTWARE_PIN ?? '',
      resolucion: cfg.resolucionDIAN ?? process.env.DIAN_RESOLUCION ?? '',
      resolucionFechaInicio: cfg.resolucionFechaInicio?.toISOString().split('T')[0] ?? '2024-01-01',
      resolucionFechaFin: cfg.resolucionFechaFin?.toISOString().split('T')[0] ?? '2025-12-31',
      prefijo: cfg.prefijoFactura ?? process.env.DIAN_PREFIJO ?? 'FE',
      rangoDesde: cfg.rangoDesde ?? 1,
      rangoHasta: cfg.rangoHasta ?? 1000,
      testingMode: cfg.testingMode,
      certificatePath: cfg.certificateP12Path ?? process.env.DIAN_CERTIFICATE_PATH,
      certificatePassword: cfg.certificatePassword ?? process.env.DIAN_CERTIFICATE_PASSWORD,
    };
  } catch {
    return null;
  }
}

function envConfig(): DIANConfig {
  const nit = (process.env.DIAN_NIT ?? '').replace(/\D/g, '');
  return {
    nit,
    digitoVerificacion: process.env.DIAN_DV ?? '0',
    nombre: process.env.COMPANY_NAME ?? 'MARAL TECNOLOGIA Y COMUNICACIONES S.A.S.',
    address: process.env.COMPANY_ADDRESS ?? 'Calle 3 # 6A-22 Bodega 101',
    city: 'Curití',
    department: 'Santander',
    phone: process.env.COMPANY_PHONE ?? '3167760692',
    email: process.env.COMPANY_EMAIL ?? 'ventas@industriasmaral.com',
    softwareId: process.env.DIAN_SOFTWARE_ID ?? '',
    softwarePin: process.env.DIAN_SOFTWARE_PIN ?? '',
    resolucion: process.env.DIAN_RESOLUCION ?? '',
    resolucionFechaInicio: process.env.DIAN_RESOLUCION_DESDE ?? '2024-01-01',
    resolucionFechaFin: process.env.DIAN_RESOLUCION_HASTA ?? '2025-12-31',
    prefijo: process.env.DIAN_PREFIJO ?? 'FE',
    rangoDesde: parseInt(process.env.DIAN_RANGO_DESDE ?? '1'),
    rangoHasta: parseInt(process.env.DIAN_RANGO_HASTA ?? '1000'),
    testingMode: process.env.DIAN_TESTING_MODE !== 'false',
    certificatePath: process.env.DIAN_CERTIFICATE_PATH,
    certificatePassword: process.env.DIAN_CERTIFICATE_PASSWORD,
  };
}

// ── GET /api/dian/config ──────────────────────────────────────
// Obtiene configuración actual (sin datos sensibles)

router.get('/config', requireRole('GERENTE'), async (_req: AuthRequest, res: Response) => {
  try {
    const cfg = await prisma.dIANConfiguration.findFirst();
    if (!cfg) {
      // Devolver config desde env
      const ec = envConfig();
      res.json({
        configured: !!ec.softwareId,
        testingMode: ec.testingMode,
        prefijo: ec.prefijo,
        resolucion: ec.resolucion,
        source: 'env',
      });
      return;
    }
    res.json({
      id: cfg.id,
      companyNIT: cfg.companyNIT,
      testingMode: cfg.testingMode,
      prefijo: cfg.prefijoFactura,
      resolucion: cfg.resolucionDIAN,
      consecutivoActual: cfg.consecutivoActual,
      hasCertificate: !!cfg.certificateP12Path,
      configured: !!(cfg.softwareId && cfg.resolucionDIAN),
      source: 'database',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración DIAN' });
  }
});

// ── PUT /api/dian/config ──────────────────────────────────────
// Guarda / actualiza configuración DIAN (solo GERENTE)

const configSchema = z.object({
  companyNIT: z.string().min(1),
  testingMode: z.boolean().optional().default(true),
  softwareId: z.string().optional(),
  softwarePin: z.string().optional(),
  resolucionDIAN: z.string().optional(),
  resolucionFechaInicio: z.string().optional(),
  resolucionFechaFin: z.string().optional(),
  prefijoFactura: z.string().optional().default('FE'),
  rangoDesde: z.number().int().optional(),
  rangoHasta: z.number().int().optional(),
  certificatePassword: z.string().optional(),
});

router.put('/config', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const body = configSchema.parse(req.body);
    const data = {
      ...body,
      resolucionFechaInicio: body.resolucionFechaInicio ? new Date(body.resolucionFechaInicio) : undefined,
      resolucionFechaFin: body.resolucionFechaFin ? new Date(body.resolucionFechaFin) : undefined,
    };
    const cfg = await prisma.dIANConfiguration.upsert({
      where: { companyNIT: body.companyNIT },
      create: data,
      update: data,
    });
    res.json({ id: cfg.id, message: 'Configuración DIAN guardada' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error(err);
    res.status(500).json({ error: 'Error al guardar configuración DIAN' });
  }
});

// ── POST /api/dian/invoices/:invoiceId/generate-ubl ───────────

router.post('/invoices/:invoiceId/generate-ubl', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.invoiceId },
      include: {
        client: true,
        order: { select: { notes: true } },
        dianInvoice: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    const config = await getDIANConfig();
    if (!config) {
      res.status(400).json({ error: 'Configure DIAN primero en Configuración → DIAN' });
      return;
    }

    const invoiceData = buildDIANInvoiceData(invoice as Parameters<typeof buildDIANInvoiceData>[0], config);
    const cufe = calculateCUFE(invoiceData, config);
    const xml  = generateUBLXML(invoiceData, cufe, config);
    const xmlPath = saveUBLXML(xml, invoiceData.number, UBL_DIR);

    // Upsert DIANInvoice record
    await prisma.dIANInvoice.upsert({
      where: { invoiceId: invoice.id },
      create: {
        invoiceId: invoice.id,
        dianStatus: 'PENDIENTE',
        dianCUFE: cufe,
        ublXmlPath: xmlPath,
      },
      update: {
        dianCUFE: cufe,
        ublXmlPath: xmlPath,
        dianStatus: 'PENDIENTE',
        errorMessage: null,
      },
    });

    res.json({
      message: 'UBL generado exitosamente',
      cufe,
      invoiceNumber: invoiceData.number,
      xmlPath,
      testingMode: config.testingMode,
    });
  } catch (err) {
    console.error('generate-ubl error:', err);
    res.status(500).json({ error: 'Error al generar UBL' });
  }
});

// ── POST /api/dian/invoices/:invoiceId/send ───────────────────

router.post('/invoices/:invoiceId/send', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const dianInv = await prisma.dIANInvoice.findUnique({
      where: { invoiceId: req.params.invoiceId },
    });

    if (!dianInv || !dianInv.ublXmlPath) {
      res.status(400).json({ error: 'Primero genera el UBL para esta factura' });
      return;
    }
    if (!fs.existsSync(dianInv.ublXmlPath)) {
      res.status(400).json({ error: 'Archivo UBL no encontrado — regenera el XML' });
      return;
    }

    const config = await getDIANConfig();
    if (!config) {
      res.status(400).json({ error: 'Configure DIAN primero' });
      return;
    }

    // TODO Fase B: firmar el XML con XAdES antes de enviar
    // Por ahora enviamos sin firma (modo prueba local)
    if (!config.testingMode) {
      res.status(501).json({
        error: 'Envío DIAN no disponible. La firma XAdES-BES (Fase B) está pendiente de implementación.',
        phase: 'B',
      });
      return;
    }

    const xml = fs.readFileSync(dianInv.ublXmlPath, 'utf8');
    const ublB64 = Buffer.from(xml, 'utf8').toString('base64');
    const soap = wrapInSOAPEnvelope(ublB64);

    await prisma.dIANInvoice.update({
      where: { invoiceId: req.params.invoiceId },
      data: { dianStatus: 'EN_PROCESO', dianSentAt: new Date() },
    });

    const response = await sendToDIAN(soap, config);

    const status = response.isValid ? 'ACEPTADA' : 'RECHAZADA';
    await prisma.dIANInvoice.update({
      where: { invoiceId: req.params.invoiceId },
      data: {
        dianStatus: response.success ? status : 'ERROR',
        dianResponse: response as object,
        errorMessage: response.errorMessage ?? null,
      },
    });

    res.json({
      success: response.isValid,
      status,
      cufe: dianInv.dianCUFE,
      errorMessage: response.errorMessage,
      statusDescription: response.statusDescription,
    });
  } catch (err) {
    console.error('send-dian error:', err);
    await prisma.dIANInvoice.update({
      where: { invoiceId: req.params.invoiceId },
      data: { dianStatus: 'ERROR', errorMessage: String(err) },
    }).catch(() => {});
    res.status(500).json({ error: 'Error al enviar a DIAN' });
  }
});

// ── GET /api/dian/invoices/:invoiceId/status ──────────────────

router.get('/invoices/:invoiceId/status', async (req: AuthRequest, res: Response) => {
  try {
    const dianInv = await prisma.dIANInvoice.findUnique({
      where: { invoiceId: req.params.invoiceId },
      include: { invoice: { select: { number: true, amount: true } } },
    });
    if (!dianInv) {
      res.json({ status: 'NO_GENERADO', cufe: null });
      return;
    }
    res.json({
      status: dianInv.dianStatus,
      cufe: dianInv.dianCUFE,
      sentAt: dianInv.dianSentAt,
      errorMessage: dianInv.errorMessage,
      invoiceNumber: dianInv.invoice?.number,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar estado DIAN' });
  }
});

// ── GET /api/dian/invoices/:invoiceId/xml ─────────────────────
// Descarga el XML UBL generado

router.get('/invoices/:invoiceId/xml', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const dianInv = await prisma.dIANInvoice.findUnique({
      where: { invoiceId: req.params.invoiceId },
    });
    if (!dianInv?.ublXmlPath || !fs.existsSync(dianInv.ublXmlPath)) {
      res.status(404).json({ error: 'XML no encontrado — genera primero el UBL' });
      return;
    }
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(dianInv.ublXmlPath)}"`);
    fs.createReadStream(dianInv.ublXmlPath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al descargar XML' });
  }
});

export default router;
