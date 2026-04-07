import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const SALT_ROUNDS = 10;

const createUserSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres'),
  role: z.enum(['GERENTE', 'VENTAS', 'LOGISTICA']),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['GERENTE', 'VENTAS', 'LOGISTICA']).optional(),
  active: z.boolean().optional(),
});

// GET /api/users — lista todos los usuarios (solo GERENTE)
router.get('/', requireRole('GERENTE'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id
router.get('/:id', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/users — crear usuario (solo GERENTE)
router.post('/', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: passwordHash,
        role: body.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        metadata: { name: user.name, role: user.role },
      },
    });

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id — editar usuario (solo GERENTE)
router.put('/:id', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const body = updateUserSchema.parse(req.body);

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (body.email && body.email !== target.email) {
      const conflict = await prisma.user.findUnique({ where: { email: body.email } });
      if (conflict) {
        res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.role) updateData.role = body.role;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: user.id,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id — desactivar usuario (soft delete, solo GERENTE)
router.delete('/:id', requireRole('GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.userId) {
      res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DEACTIVATE',
        entityType: 'User',
        entityId: req.params.id,
        metadata: { name: target.name },
      },
    });

    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

export default router;
