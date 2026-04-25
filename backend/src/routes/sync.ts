import { Router, Response, Request, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware para rutas del agente Python: verifica X-Sync-Secret.
// Si SYNC_SECRET no está configurado, acepta la request (desarrollo local).
function syncSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return next();
  if (req.headers['x-sync-secret'] === secret) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── State ─────────────────────────────────────────────────────────────────────

interface SyncStatusData {
  lastSync: string | null;
  status: 'never' | 'ok' | 'error' | 'running' | 'pending';
  clientsSynced: number;
  productsSynced: number;
  message?: string;
}

let syncStatus: SyncStatusData = {
  lastSync: null,
  status: 'never',
  clientsSynced: 0,
  productsSynced: 0,
};

// ── GET /api/sync/status ──────────────────────────────────────────────────────

router.get('/status', authenticate, (_req: AuthRequest, res: Response) => {
  res.json(syncStatus);
});

// ── POST /api/sync/request — UI calls this when user clicks "Sincronizar" ────

router.post('/request', authenticate, (_req: AuthRequest, res: Response) => {
  if (syncStatus.status === 'running' || syncStatus.status === 'pending') {
    res.status(409).json({ error: 'Ya hay una sincronización en curso' });
    return;
  }

  syncStatus = {
    ...syncStatus,
    status: 'pending',
    message: 'Esperando al agente local de sincronización...',
  };

  res.json({ message: 'Solicitud de sincronización enviada' });
});

// ── GET /api/sync/pending — local agent polls this ───────────────────────────

router.get('/pending', syncSecret, (_req: AuthRequest, res: Response) => {
  const isPending = syncStatus.status === 'pending';

  if (isPending) {
    // Mark as running so we don't trigger twice
    syncStatus = {
      ...syncStatus,
      status: 'running',
      message: 'Sincronizando datos desde Merlin...',
    };
  }

  res.json({ pending: isPending });
});

// ── POST /api/sync/complete — local agent posts results ───────────────────────

router.post('/complete', syncSecret, (req: AuthRequest, res: Response) => {
  const { success, clientsSynced, productsSynced, message } = req.body;

  syncStatus = {
    lastSync: new Date().toISOString(),
    status: success ? 'ok' : 'error',
    clientsSynced: clientsSynced ?? 0,
    productsSynced: productsSynced ?? 0,
    message: message ?? (success ? 'Sincronización completada' : 'Error en la sincronización'),
  };

  res.json({ message: 'Estado actualizado' });
});

// ── Merlin write-back: agente local polling ───────────────────────────────────

// GET /api/sync/merlin-pending — el agente local llama esto cada N segundos
// Devuelve la primera factura PENDING con todos los datos necesarios para escribir en Merlin
router.get('/merlin-pending', syncSecret, async (_req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.merlinSyncQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        invoice: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                rut: true,
                merlinCode: true,
                paymentDays: true,
              },
            },
            order: {
              include: {
                items: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        reference: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      res.json({ pending: false });
      return;
    }

    // Marcar como PROCESSING para evitar que otro agente lo tome
    await prisma.merlinSyncQueue.update({
      where: { id: item.id },
      data: { status: 'PROCESSING' },
    });

    res.json({ pending: true, queueId: item.id, invoice: item.invoice });
  } catch (error) {
    console.error('Merlin pending error:', error);
    res.status(500).json({ error: 'Error al consultar cola Merlin' });
  }
});

// POST /api/sync/merlin-done — el agente reporta éxito
router.post('/merlin-done', syncSecret, async (req: AuthRequest, res: Response) => {
  try {
    const { queueId, merlinRef } = req.body as { queueId: string; merlinRef: string };

    if (!queueId || !merlinRef) {
      res.status(400).json({ error: 'queueId y merlinRef son requeridos' });
      return;
    }

    const item = await prisma.merlinSyncQueue.findUnique({ where: { id: queueId } });
    if (!item) {
      res.status(404).json({ error: 'Item de cola no encontrado' });
      return;
    }

    await prisma.$transaction([
      prisma.merlinSyncQueue.update({
        where: { id: queueId },
        data: { status: 'DONE', merlinRef },
      }),
      prisma.invoice.update({
        where: { id: item.invoiceId },
        data: { merlinRef, merlinSynced: true },
      }),
    ]);

    console.log(`Merlin sync OK: invoice ${item.invoiceId} → ${merlinRef}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('Merlin done error:', error);
    res.status(500).json({ error: 'Error al confirmar sync Merlin' });
  }
});

// POST /api/sync/merlin-error — el agente reporta fallo
router.post('/merlin-error', syncSecret, async (req: AuthRequest, res: Response) => {
  try {
    const { queueId, error: errorMsg } = req.body as { queueId: string; error: string };

    if (!queueId) {
      res.status(400).json({ error: 'queueId es requerido' });
      return;
    }

    await prisma.merlinSyncQueue.update({
      where: { id: queueId },
      data: { status: 'ERROR', error: errorMsg ?? 'Error desconocido' },
    });

    console.error(`Merlin sync ERROR: queue ${queueId} — ${errorMsg}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('Merlin error report error:', error);
    res.status(500).json({ error: 'Error al reportar fallo de sync Merlin' });
  }
});

// GET /api/sync/merlin-queue — estado de la cola para la UI
router.get('/merlin-queue', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [pending, processing, done, errors] = await Promise.all([
      prisma.merlinSyncQueue.count({ where: { status: 'PENDING' } }),
      prisma.merlinSyncQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.merlinSyncQueue.count({ where: { status: 'DONE' } }),
      prisma.merlinSyncQueue.count({ where: { status: 'ERROR' } }),
    ]);

    const recent = await prisma.merlinSyncQueue.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        invoice: { select: { number: true, amount: true } },
      },
    });

    res.json({ pending, processing, done, errors, recent });
  } catch (error) {
    console.error('Merlin queue error:', error);
    res.status(500).json({ error: 'Error al obtener cola Merlin' });
  }
});

export default router;
