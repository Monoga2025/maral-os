import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

async function notifyTaskWhatsApp(
  assigneeName: string,
  assigneeWhatsapp: string | null | undefined,
  taskTitle: string,
  priority: string,
  createdByName: string,
): Promise<void> {
  if (!assigneeWhatsapp) return;
  const waUrl = process.env.EVOLUTION_API_URL ?? '';
  const waKey = process.env.EVOLUTION_API_KEY ?? '';
  if (!waUrl || !waKey) return;

  const priorityEmoji: Record<string, string> = {
    URGENTE: '🔴 URGENTE',
    NORMAL:  '🟡 Normal',
    DESPUES: '🔵 Después',
  };
  const prioLabel = priorityEmoji[priority] ?? priority;
  const number = assigneeWhatsapp.replace(/\D/g, '');
  const fullNumber = number.startsWith('57') ? number : `57${number}`;

  const text =
    `📋 *Nueva tarea asignada*\n` +
    `Hola ${assigneeName}, tienes una nueva tarea:\n\n` +
    `*${taskTitle}*\n` +
    `Prioridad: ${prioLabel}\n` +
    `Asignada por: ${createdByName}`;

  try {
    await fetch(`${waUrl}/message/sendText/maral-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: waKey },
      body: JSON.stringify({ number: fullNumber, text }),
    });
  } catch {
    // Notificación opcional — no bloquea la respuesta
  }
}

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  priority: z.enum(['URGENTE', 'NORMAL', 'DESPUES']).optional().default('NORMAL'),
  assignedToId: z.string().min(1, 'Asignar a alguien es requerido'),
  clientId: z.string().optional(),
  orderId: z.string().optional(),
  dueDate: z.string().optional(),
});

// GET /api/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const assignedToId = req.query.assignedToId as string;
    const createdById = req.query.createdById as string;
    const clientId = req.query.clientId as string;
    const orderId = req.query.orderId as string;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (createdById) where.createdById = createdById;
    if (clientId) where.clientId = clientId;
    if (orderId) where.orderId = orderId;

    // Visibilidad: GERENTE ve todo; VENTAS ve GERENTE+VENTAS; LOGISTICA solo las suyas
    if (req.user!.role === 'LOGISTICA') {
      where.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
      ];
    } else if (req.user!.role === 'VENTAS') {
      where.OR = [
        { assignedTo: { role: { in: ['GERENTE', 'VENTAS'] } } },
        { createdBy: { role: { in: ['GERENTE', 'VENTAS'] } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // URGENTE < NORMAL < DESPUES (orden alfabético coincide)
        { createdAt: 'desc' },
      ],
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, whatsapp: true } },
        client: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST /api/tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'LOGISTICA') {
    res.status(403).json({ error: 'Solo GERENTE y VENTAS pueden crear y asignar tareas' });
    return;
  }
  try {
    const validation = taskSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { dueDate, ...rest } = validation.data;

    const task = await prisma.task.create({
      data: {
        ...rest,
        createdById: req.user!.userId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, whatsapp: true } },
        client: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'Task',
        entityId: task.id,
        metadata: { title: task.title, assignedToId: task.assignedToId },
      },
    });

    // Notificación WhatsApp al asignado (sin await — no bloquea la respuesta)
    notifyTaskWhatsApp(
      task.assignedTo.name,
      (task.assignedTo as any).whatsapp,
      task.title,
      task.priority,
      task.createdBy.name,
    );

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, whatsapp: true } },
        client: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Error al obtener tarea' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  if (req.user!.role === 'LOGISTICA') {
    res.status(403).json({ error: 'Solo GERENTE y VENTAS pueden modificar tareas' });
    return;
  }
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }

    const validation = taskSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { dueDate, ...rest } = validation.data;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, whatsapp: true } },
        client: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    });

    if (rest.assignedToId && rest.assignedToId !== existing.assignedToId) {
      notifyTaskWhatsApp(
        task.assignedTo.name,
        (task.assignedTo as any).whatsapp,
        task.title,
        task.priority,
        task.createdBy.name,
      );
    }

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Estado inválido. Valores válidos: ${validStatuses.join(', ')}` });
      return;
    }

    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status,
        completedAt: status === 'COMPLETADA' ? new Date() : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, whatsapp: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'STATUS_CHANGE',
        entityType: 'Task',
        entityId: task.id,
        metadata: { from: existing.status, to: status },
      },
    });

    res.json(task);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Error al actualizar estado de tarea' });
  }
});

// DELETE /api/tasks/:id — solo creador o GERENTE
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }

    if (req.user!.role !== 'GERENTE' && existing.createdById !== req.user!.userId) {
      res.status(403).json({ error: 'Solo el creador o un gerente puede eliminar esta tarea' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

export default router;
