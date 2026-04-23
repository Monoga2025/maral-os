/**
 * Script de uso único: setea whatsapp/phone de los usuarios del equipo
 * Ejecutar en EasyPanel console: npx tsx prisma/set-user-phones.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PHONES: { email: string; name: string; whatsapp: string }[] = [
  { email: 'john@maral.com',                   name: 'John Mónoga',    whatsapp: '3177606126' },
  { email: 'lady@maral.com',                   name: 'Lady',           whatsapp: '3167760692' },
  { email: 'janneth@industriasmaral.com',      name: 'Janneth Mónoga', whatsapp: '3164526523' },
  { email: 'ingenieria@industriasmaral.com',   name: 'John (ingenieria)', whatsapp: '3177606126' },
];

async function main() {
  for (const p of PHONES) {
    const user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) {
      console.log(`⚠  No encontrado: ${p.email}`);
      continue;
    }
    await prisma.user.update({
      where: { email: p.email },
      data: { whatsapp: p.whatsapp, phone: p.whatsapp },
    });
    console.log(`✓  ${user.name} (${p.email}) → WhatsApp: ${p.whatsapp}`);
  }
  console.log('\nListo. Ahora las notificaciones funcionarán.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
