const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function upsertUser({ name, email, password, cedula, role }) {
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, password: hash, cedula, role, active: true },
    create: { name, email, password: hash, cedula, role, active: true },
  });
  console.log(`ok ${email} ${role}`);
}

async function main() {
  await upsertUser({
    name: 'Janneth',
    email: 'janneth@industriasmaral.com',
    password: '63328625',
    cedula: '63328625',
    role: 'CONTADORA',
  });

  await upsertUser({
    name: 'John Monoga',
    email: 'john@maral.com',
    password: '80163914',
    cedula: '80163914',
    role: 'GERENTE',
  });

  await upsertUser({
    name: 'Lady',
    email: 'lady@maral.com',
    password: '63541610',
    cedula: '63541610',
    role: 'VENTAS',
  });

  await upsertUser({
    name: 'Produccion',
    email: 'produccion@industriasmaral.com',
    password: crypto.randomBytes(48).toString('hex'),
    cedula: crypto.randomBytes(32).toString('hex'),
    role: 'LOGISTICA',
  });

  await prisma.user.updateMany({
    where: { email: 'produccion@maral.com' },
    data: { active: false, cedula: crypto.randomBytes(32).toString('hex') },
  });
  console.log('old produccion@maral.com disabled');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
