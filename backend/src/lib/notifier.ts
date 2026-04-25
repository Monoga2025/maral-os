import prisma from './prisma';
import { evolutionApi } from './evolutionApi';

export async function notifyHotLead(params: {
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  recipientId: string;
  intent: string;
}): Promise<void> {
  const { clientId, clientName, campaignId, campaignName, recipientId, intent } = params;

  // Persist notification for all GERENTE/VENTAS users
  await prisma.notification.create({
    data: {
      type: 'HOT_LEAD',
      title: `🔥 Lead caliente: ${clientName}`,
      body: intent,
      meta: { clientId, campaignId, recipientId, campaignName },
    },
  });

  // WhatsApp push to John if configured
  const johnPhone = process.env.HOT_LEAD_NOTIFY_PHONE;
  if (johnPhone) {
    const msg = `🔥 *LEAD CALIENTE*\n*Cliente:* ${clientName}\n*Campaña:* ${campaignName}\n*Intención:* ${intent}\n\nResponde en el siguiente link:\n${process.env.APP_URL ?? 'http://localhost:5173'}/whatsapp/leads`;
    evolutionApi.sendTextMessage(johnPhone, msg).catch(() => {});
  }
}

export async function getUnreadNotifications(userId?: string): Promise<{
  id: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}[]> {
  return prisma.notification.findMany({
    where: {
      readAt: null,
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, type: true, title: true, body: true, meta: true, createdAt: true },
  }) as Promise<{ id: string; type: string; title: string; body: string; meta: Record<string, unknown> | null; createdAt: Date }[]>;
}

export async function markNotificationRead(id: string): Promise<void> {
  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}
