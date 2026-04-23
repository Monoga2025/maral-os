import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const loginCedulaSchema = z.object({
  userId: z.string().min(1),
  cedula: z.string().min(4, 'Cédula inválida'),
});

// GET /api/auth/users — lista pública de usuarios activos (para tarjetas de login)
router.get('/users', async (_req, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true, cedula: { not: null } },
      select: { id: true, name: true, role: true, title: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login-cedula
router.post('/login-cedula', async (req, res: Response) => {
  try {
    const validation = loginCedulaSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }
    const { userId, cedula } = validation.data;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || !user.cedula) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }
    if (user.cedula !== cedula.trim()) {
      res.status(401).json({ error: 'Cédula incorrecta' });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login cedula error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.flatten() });
      return;
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    if (!user.active) {
      res.status(401).json({ error: 'Usuario desactivado. Contacta al administrador.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
