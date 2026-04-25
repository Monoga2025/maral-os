import prisma from './prisma';

// Approximate costs in USD (update if OpenRouter pricing changes)
const COST_PER_OP: Record<string, number> = {
  'image-gen':     0.04,
  'marco-chat':    0.001,
  'lady-suggest':  0.0005,
  'brand-guard':   0.0002,
};

export async function logAIUsage(params: {
  userId: string;
  operation: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  metadata?: object;
}): Promise<void> {
  const costUSD = COST_PER_OP[params.operation] ?? 0;
  try {
    await (prisma as { aIUsageLog?: { create: (args: object) => Promise<unknown> } }).aIUsageLog?.create({
      data: {
        userId: params.userId,
        operation: params.operation,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUSD,
        metadata: params.metadata ?? {},
      },
    });
  } catch {
    // Non-blocking — usage logging should never break the main flow
  }
}

export async function getMonthlySpend(userId?: string): Promise<{
  totalUSD: number;
  totalCOP: number;
  byOperation: Record<string, number>;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const logs = await (prisma as {
      aIUsageLog?: {
        findMany: (args: object) => Promise<{ operation: string; costUSD: number | null }[]>;
      };
    }).aIUsageLog?.findMany({
      where: {
        ...(userId ? { userId } : {}),
        createdAt: { gte: startOfMonth },
      },
      select: { operation: true, costUSD: true },
    }) ?? [];

    let totalUSD = 0;
    const byOperation: Record<string, number> = {};

    for (const log of logs) {
      const cost = Number(log.costUSD) || 0;
      totalUSD += cost;
      byOperation[log.operation] = (byOperation[log.operation] ?? 0) + cost;
    }

    const USD_TO_COP = Number(process.env.USD_TO_COP_RATE) || 4200;

    return {
      totalUSD,
      totalCOP: Math.round(totalUSD * USD_TO_COP),
      byOperation,
    };
  } catch {
    return { totalUSD: 0, totalCOP: 0, byOperation: {} };
  }
}

// Returns how many images this user generated in the last hour
export async function countRecentGenerations(userId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  try {
    return await (prisma as {
      aIUsageLog?: { count: (args: object) => Promise<number> };
    }).aIUsageLog?.count({
      where: {
        userId,
        operation: 'image-gen',
        createdAt: { gte: oneHourAgo },
      },
    }) ?? 0;
  } catch {
    return 0;
  }
}
