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
    name: 'Janet',
    email: 'janet@industriasmaral.com',
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
    name: 'Wilson',
    email: 'wilson@industriasmaral.com',
    password: '1098670002',
    cedula: '1098670002',
    role: 'VENTAS',
  });

  await upsertUser({
    name: 'Iván',
    email: 'ivan@industriasmaral.com',
    password: '1098670001',
    cedula: '1098670001',
    role: 'LOGISTICA',
  });

  await prisma.user.updateMany({
    where: { email: { in: ['lady@maral.com', 'angelo@maral.com', 'produccion@maral.com', 'produccion@industriasmaral.com', 'janneth@industriasmaral.com'] } },
    data: { active: false },
  });
  console.log('Old users disabled');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
