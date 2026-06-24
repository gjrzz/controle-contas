import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Usuários
  const users = [
    { email: 'admin@empresa.com', name: 'Administrador', role: Role.ADMIN },
    { email: 'operador@empresa.com', name: 'Operador Teste', role: Role.OPERADOR },
    { email: 'aprovador@empresa.com', name: 'Aprovador Teste', role: Role.APROVADOR },
    { email: 'financeiro@empresa.com', name: 'Financeiro Teste', role: Role.FINANCEIRO },
  ];

  const password = await bcrypt.hash('123456', 12);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        password,
        role: user.role,
      },
    });
    console.log(`  ✓ Usuário ${user.email} (${user.role})`);
  }

  // Tipos de serviço
  const serviceTypes = [
    'TI',
    'Limpeza',
    'Segurança',
    'Consultoria',
    'Manutenção',
    'Transporte',
    'Alimentação',
    'Telecomunicações',
  ];

  for (const name of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ Tipo de serviço: ${name}`);
  }

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
