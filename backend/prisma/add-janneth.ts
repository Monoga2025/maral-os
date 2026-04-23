/**
 * Script de uso único: crea el usuario Janneth Mónoga
 * Ejecutar: npx tsx prisma/add-janneth.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'janneth@industriasmaral.com';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Actualizar whatsapp y rol si ya existe
    const updated = await prisma.user.update({
      where: { email },
      data: { whatsapp: '3164526523', role: 'CONTADORA' as any },
      select: { id: true, name: true, email: true, role: true, whatsapp: true },
    });
    console.log('Usuario actualizado:', updated);
    return;
  }

  const passwordHash = await bcrypt.hash('maral2024', 10);

  const user = await prisma.user.create({
    data: {
      name: 'Janneth Mónoga',
      email,
      password: passwordHash,
      role: 'CONTADORA' as any,
      whatsapp: '3164526523',
      active: true,
    },
    select: { id: true, name: true, email: true, role: true, whatsapp: true },
  });

  console.log('Usuario creado:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
