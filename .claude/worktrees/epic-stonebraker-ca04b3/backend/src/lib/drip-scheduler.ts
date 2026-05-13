import prisma from './prisma';
import { evolutionApi } from './evolutionApi';

const QUIET_START = 22; // 10pm
const QUIET_END   = 7;  // 7am

function isQuietHour(): boolean {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).getHours();
  return h >= QUIET_START || h < QUIET_END;
}

interface DripStep {
  delayHours: number;
  content: string;
}

// Seed the 3 default drip sequences if they don't exist yet
export async function seedDripSequences(): Promise<void> {
  const sequences = [
    {
      trigger: 'WARM_NO_CONVERT_3D',
      name: 'Reactivación WARM (3 días)',
      steps: [
        {
          delayHours: 72,
          content: 'Hola {primerNombre} 👋 Te escribí hace unos días sobre nuestros productos MARAL. ¿Alguna duda técnica que pueda aclararte? Estoy aquí para ayudarte.',
        },
      ],
    },
    {
      trigger: 'COLD_FOLLOWUP_7D',
      name: 'Seguimiento COLD (7 días)',
      steps: [
        {
          delayHours: 168,
          content: 'Hola {primerNombre}, soy Lady de MARAL. Hace unos días te compartí información sobre nuestros equipos. Si en algún momento necesitas apoyo en telecomunicaciones, aquí estaremos. 🙌',
        },
      ],
    },
    {
      trigger: 'HOT_NOT_ATTENDED_1H',
      name: 'Alerta HOT sin atender (1h)',
      steps: [
        {
          delayHours: 1,
          content: '⚠️ INTERNO: El cliente {nombre} lleva más de 1 hora esperando respuesta. Está caliente. Atiéndelo ya.',
        },
      ],
    },
  ];

  for (const seq of sequences) {
    await prisma.dripSequence.upsert({
      where: { trigger: seq.trigger },
      update: {},
      create: seq,
    });
  }
}

export async function enrollInDrip(params: {
  trigger: string;
  clientId: string;
  campaignId?: string;
}): Promise<void> {
  const seq = await prisma.dripSequence.findUnique({ where: { trigger: params.trigger } });
  if (!seq || !seq.active) return;

  const steps = seq.steps as unknown as DripStep[];
  if (!steps.length) return;

  const firstDelayMs = steps[0].delayHours * 60 * 60 * 1000;
  const nextSendAt = new Date(Date.now() + firstDelayMs);

  await prisma.dripEnrollment.upsert({
    where: { sequenceId_clientId: { sequenceId: seq.id, clientId: params.clientId } },
    update: { status: 'ACTIVE', currentStep: 0, nextSendAt, campaignId: params.campaignId },
    create: {
      sequenceId: seq.id,
      clientId: params.clientId,
      campaignId: params.campaignId,
      nextSendAt,
    },
  });
}

export async function cancelDripsForClient(clientId: string): Promise<void> {
  await prisma.dripEnrollment.updateMany({
    where: { clientId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });
}

// Worker — runs every 10 minutes
export function startDripWorker(): void {
  const run = async () => {
    if (isQuietHour()) return;

    const due = await prisma.dripEnrollment.findMany({
      where: { status: 'ACTIVE', nextSendAt: { lte: new Date() } },
      include: {
        sequence: true,
        client: { select: { id: true, name: true, whatsapp: true, phone: true } },
      },
      take: 20,
    });

    for (const enrollment of due) {
      try {
        const steps = enrollment.sequence.steps as unknown as DripStep[];
        const step = steps[enrollment.currentStep];
        if (!step) {
          await prisma.dripEnrollment.update({
            where: { id: enrollment.id },
            data: { status: 'COMPLETED' },
          });
          continue;
        }

        const phone = enrollment.client.whatsapp ?? enrollment.client.phone;
        if (phone) {
          const firstName = enrollment.client.name.split(' ')[0];
          const msg = step.content
            .replace('{nombre}', enrollment.client.name)
            .replace('{primerNombre}', firstName);

          // HOT_NOT_ATTENDED_1H is an internal alert, not a client message
          if (enrollment.sequence.trigger === 'HOT_NOT_ATTENDED_1H') {
            const johnPhone = process.env.HOT_LEAD_NOTIFY_PHONE;
            if (johnPhone) evolutionApi.sendTextMessage(johnPhone, msg).catch(() => {});
          } else {
            evolutionApi.sendTextMessage(phone, msg).catch(() => {});
          }
        }

        const nextStepIndex = enrollment.currentStep + 1;
        const nextStep = steps[nextStepIndex];

        if (nextStep) {
          const nextSendAt = new Date(Date.now() + nextStep.delayHours * 60 * 60 * 1000);
          await prisma.dripEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStep: nextStepIndex, nextSendAt },
          });
        } else {
          await prisma.dripEnrollment.update({
            where: { id: enrollment.id },
            data: { status: 'COMPLETED' },
          });
        }
      } catch (err) {
        console.error('[drip-worker] Error processing enrollment', enrollment.id, err);
      }
    }
  };

  // Run immediately then every 10 min
  run().catch(console.error);
  setInterval(() => run().catch(console.error), 10 * 60 * 1000);
  console.log('[drip-worker] Started (10min interval)');
}
