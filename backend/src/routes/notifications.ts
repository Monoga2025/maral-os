import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUnreadNotifications, markNotificationRead } from '../lib/notifier';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/notifications — polling endpoint
router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await getUnreadNotifications(req.user!.userId);
  res.json({ data: notifications, count: notifications.length });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: {
      readAt: null,
      OR: [{ userId: null }, { userId: req.user!.userId }],
    },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await markNotificationRead(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Notificación no encontrada' });
  }
});

// GET /api/notifications/leads — leads list for kanban dashboard
router.get('/leads', async (req: AuthRequest, res: Response) => {
  const { campaignId, temperature } = req.query as {
    campaignId?: string;
    temperature?: string;
  };

  const where = {
    ...(campaignId ? { campaignId } : {}),
    ...(temperature ? { temperature: temperature as never } : { temperature: { not: null } }),
    status: { in: ['SENT', 'DELIVERED', 'READ', 'REPLIED'] as never[] },
  };

  const recipients = await prisma.campaignRecipient.findMany({
    where,
    orderBy: [
      { temperature: 'asc' }, // HOT first when sorted alphabetically reversed
      { repliedAt: 'desc' },
    ],
    take: 200,
    include: {
      client: { select: { id: true, name: true, company: true, whatsapp: true, phone: true, city: true } },
      campaign: { select: { id: true, name: true, objective: true } },
    },
  });

  // Group by temperature
  const grouped: Record<string, typeof recipients> = {
    HOT: [],
    WARM: [],
    COLD: [],
    OPTOUT: [],
  };

  for (const r of recipients) {
    const temp = r.temperature ?? 'COLD';
    if (grouped[temp]) grouped[temp].push(r);
    else grouped.COLD.push(r);
  }

  // Sort HOT first by repliedAt asc (oldest unattended first)
  grouped.HOT.sort((a, b) => {
    const aTime = a.repliedAt ? new Date(a.repliedAt).getTime() : 0;
    const bTime = b.repliedAt ? new Date(b.repliedAt).getTime() : 0;
    return aTime - bTime;
  });

  res.json({
    HOT: grouped.HOT,
    WARM: grouped.WARM,
    COLD: grouped.COLD,
    OPTOUT: grouped.OPTOUT,
    totals: {
      HOT: grouped.HOT.length,
      WARM: grouped.WARM.length,
      COLD: grouped.COLD.length,
      OPTOUT: grouped.OPTOUT.length,
    },
  });
});

// PATCH /api/notifications/leads/:recipientId/attended — mark as CONVERTED/attended
router.patch('/leads/:recipientId/attended', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await prisma.campaignRecipient.update({
      where: { id: req.params.recipientId },
      data: { convertedAt: new Date() },
    });
    res.json({ ok: true, id: updated.id });
  } catch {
    res.status(404).json({ error: 'Recipient no encontrado' });
  }
});

// GET /api/notifications/campaign-report/:campaignId
router.get('/campaign-report/:campaignId', async (req: AuthRequest, res: Response) => {
  const { campaignId } = req.params;

  const [campaign, metrics, recipientStats, quotations, orders] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { metrics: true },
    }),
    prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    }),
    prisma.campaignRecipient.groupBy({
      by: ['temperature'],
      where: { campaignId, temperature: { not: null } },
      _count: true,
    }),
    prisma.quotation.count({ where: { sourceCampaignId: campaignId } }),
    prisma.order.findMany({
      where: { sourceCampaignId: campaignId },
      select: { id: true, total: true, status: true },
    }),
  ]);

  if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }

  const revenue = orders
    .filter((o) => o.status === 'ENTREGADO')
    .reduce((sum, o) => sum + o.total, 0);

  res.json({
    campaign,
    metrics,
    recipientStats,
    temperatureStats: recipientStats,
    quotationsGenerated: quotations,
    ordersTotal: orders.length,
    ordersDelivered: orders.filter((o) => o.status === 'ENTREGADO').length,
    revenueCOP: revenue,
  });
});

// GET /api/notifications/global-report — CEO funnel across all campaigns
router.get('/global-report', async (_req: AuthRequest, res: Response) => {
  const [allCampaigns, byStatus, byTemp, quotations, orders] = await Promise.all([
    prisma.campaign.findMany({
      include: { metrics: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.campaignRecipient.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.campaignRecipient.groupBy({
      by: ['temperature'],
      where: { temperature: { not: null } },
      _count: true,
    }),
    prisma.quotation.count({ where: { sourceCampaignId: { not: null } } }),
    prisma.order.findMany({
      where: { sourceCampaignId: { not: null } },
      select: { id: true, total: true, status: true, sourceCampaignId: true },
    }),
  ]);

  const revenue = orders
    .filter((o) => o.status === 'ENTREGADO')
    .reduce((sum, o) => sum + o.total, 0);

  res.json({
    campaigns: allCampaigns,
    recipientsByStatus: byStatus,
    recipientsByTemperature: byTemp,
    quotationsFromCampaigns: quotations,
    ordersFromCampaigns: orders.length,
    revenueFromCampaigns: revenue,
  });
});

export default router;
