import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateCampaignImage, ImageTemplate, AspectRatio } from '../lib/image-gen';
import { validateBrand } from '../lib/brand-guard';
import { logAIUsage, countRecentGenerations } from '../lib/cost-tracker';

const router = Router();
router.use(authenticate);

const HOURLY_LIMIT = 20;

// POST /api/image-gen/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'Generación de imágenes no configurada (falta OPENROUTER_API_KEY)' });
    return;
  }

  const userId = req.user!.userId;
  const recent = await countRecentGenerations(userId);
  if (recent >= HOURLY_LIMIT) {
    res.status(429).json({ error: `Límite de ${HOURLY_LIMIT} generaciones/hora alcanzado. Intenta más tarde.` });
    return;
  }

  const { referenceImages, prompt, template, aspectRatio, brandLock, campaignId } = req.body as {
    referenceImages?: string[];
    prompt: string;
    template?: ImageTemplate;
    aspectRatio?: AspectRatio;
    brandLock?: boolean;
    campaignId?: string;
  };

  if (!prompt || prompt.trim().length < 5) {
    res.status(400).json({ error: 'El prompt es requerido (mínimo 5 caracteres)' });
    return;
  }

  try {
    const result = await generateCampaignImage({
      referenceImages,
      prompt: prompt.trim(),
      template,
      aspectRatio: aspectRatio ?? '1:1',
      brandLock: brandLock !== false,
      campaignId,
    });

    // Brand validation (non-blocking — runs after main generation)
    const brandResult = await validateBrand(result.base64, result.mimeType);

    // Persist to DB
    const image = await prisma.generatedImage.create({
      data: {
        createdById: userId,
        url: result.fileUrl,
        prompt: prompt.trim(),
        template: template ?? null,
        aspectRatio: aspectRatio ?? '1:1',
        referenceImages: referenceImages ?? [],
        approvedByBrand: brandResult.approved,
        brandScore: brandResult.professionalScore,
        brandIssues: brandResult.issues,
        metadata: { campaignId: campaignId ?? null },
      },
    });

    // Log usage (non-blocking)
    logAIUsage({ userId, operation: 'image-gen', model: 'google/gemini-2.5-flash-image-preview' }).catch(() => {});

    res.json({
      id: image.id,
      url: result.fileUrl,
      brandGuard: brandResult,
    });
  } catch (error) {
    const msg = (error as Error).message ?? 'Error desconocido';
    console.error('[image-gen] generate error:', msg.slice(0, 300));
    res.status(500).json({ error: msg.slice(0, 200) });
  }
});

// POST /api/image-gen/regenerate/:imageId
router.post('/regenerate/:imageId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { imageId } = req.params;

  const existing = await prisma.generatedImage.findUnique({ where: { id: imageId } });
  if (!existing) { res.status(404).json({ error: 'Imagen no encontrada' }); return; }
  if (existing.createdById !== userId && req.user!.role !== 'GERENTE') {
    res.status(403).json({ error: 'Sin permisos' }); return;
  }

  const recent = await countRecentGenerations(userId);
  if (recent >= HOURLY_LIMIT) {
    res.status(429).json({ error: `Límite de ${HOURLY_LIMIT} generaciones/hora alcanzado.` });
    return;
  }

  try {
    const result = await generateCampaignImage({
      referenceImages: Array.isArray(existing.referenceImages) ? existing.referenceImages as string[] : [],
      prompt: existing.prompt,
      template: existing.template as ImageTemplate | undefined,
      aspectRatio: (existing.aspectRatio as AspectRatio) ?? '1:1',
      brandLock: true,
    });

    const brandResult = await validateBrand(result.base64, result.mimeType);

    const newImage = await prisma.generatedImage.create({
      data: {
        createdById: userId,
        url: result.fileUrl,
        prompt: existing.prompt,
        template: existing.template,
        aspectRatio: existing.aspectRatio,
        referenceImages: existing.referenceImages ?? [],
        approvedByBrand: brandResult.approved,
        brandScore: brandResult.professionalScore,
        brandIssues: brandResult.issues,
        metadata: { regeneratedFrom: imageId },
      },
    });

    logAIUsage({ userId, operation: 'image-gen', model: 'google/gemini-2.5-flash-image-preview' }).catch(() => {});

    res.json({ id: newImage.id, url: result.fileUrl, brandGuard: brandResult });
  } catch (error) {
    const msg = (error as Error).message ?? 'Error desconocido';
    console.error('[image-gen] regenerate error:', msg.slice(0, 300));
    res.status(500).json({ error: msg.slice(0, 200) });
  }
});

// POST /api/image-gen/variant/:imageId
router.post('/variant/:imageId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { imageId } = req.params;
  const { additionalPrompt } = req.body as { additionalPrompt?: string };

  const existing = await prisma.generatedImage.findUnique({ where: { id: imageId } });
  if (!existing) { res.status(404).json({ error: 'Imagen no encontrada' }); return; }

  const recent = await countRecentGenerations(userId);
  if (recent >= HOURLY_LIMIT) {
    res.status(429).json({ error: `Límite de ${HOURLY_LIMIT} generaciones/hora alcanzado.` });
    return;
  }

  try {
    const combinedPrompt = additionalPrompt
      ? `${existing.prompt}. VARIACIÓN: ${additionalPrompt}`
      : existing.prompt;

    const result = await generateCampaignImage({
      referenceImages: Array.isArray(existing.referenceImages) ? existing.referenceImages as string[] : [],
      prompt: combinedPrompt,
      template: existing.template as ImageTemplate | undefined,
      aspectRatio: (existing.aspectRatio as AspectRatio) ?? '1:1',
      brandLock: true,
    });

    const brandResult = await validateBrand(result.base64, result.mimeType);

    const newImage = await prisma.generatedImage.create({
      data: {
        createdById: userId,
        url: result.fileUrl,
        prompt: combinedPrompt,
        template: existing.template,
        aspectRatio: existing.aspectRatio,
        referenceImages: existing.referenceImages ?? [],
        approvedByBrand: brandResult.approved,
        brandScore: brandResult.professionalScore,
        brandIssues: brandResult.issues,
        metadata: { variantOf: imageId, additionalPrompt },
      },
    });

    logAIUsage({ userId, operation: 'image-gen', model: 'google/gemini-2.5-flash-image-preview' }).catch(() => {});

    res.json({ id: newImage.id, url: result.fileUrl, brandGuard: brandResult });
  } catch (error) {
    const msg = (error as Error).message ?? 'Error desconocido';
    res.status(500).json({ error: msg.slice(0, 200) });
  }
});

// GET /api/image-gen/library
router.get('/library', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { template, page = '1', limit = '24' } = req.query as {
    template?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    createdById: userId,
    ...(template ? { template } : {}),
  };

  const [images, total] = await Promise.all([
    prisma.generatedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        url: true,
        prompt: true,
        template: true,
        aspectRatio: true,
        approvedByBrand: true,
        brandScore: true,
        brandIssues: true,
        usedInCampaigns: true,
        createdAt: true,
      },
    }),
    prisma.generatedImage.count({ where }),
  ]);

  res.json({
    data: images,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

// DELETE /api/image-gen/:imageId
router.delete('/:imageId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { imageId } = req.params;

  const image = await prisma.generatedImage.findUnique({ where: { id: imageId } });
  if (!image) { res.status(404).json({ error: 'Imagen no encontrada' }); return; }
  if (image.createdById !== userId && req.user!.role !== 'GERENTE') {
    res.status(403).json({ error: 'Sin permisos' }); return;
  }

  await prisma.generatedImage.delete({ where: { id: imageId } });
  res.json({ ok: true });
});

// GET /api/image-gen/ai-spend — GERENTE only
router.get('/ai-spend', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'GERENTE') {
    res.status(403).json({ error: 'Solo GERENTE puede ver el gasto de IA' }); return;
  }
  const { getMonthlySpend } = await import('../lib/cost-tracker');
  const spend = await getMonthlySpend();
  const budget = Number(process.env.AI_MONTHLY_BUDGET_COP) || 500000;
  res.json({
    ...spend,
    budgetCOP: budget,
    overBudget: spend.totalCOP > budget,
  });
});

export default router;
