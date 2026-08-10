import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ key: string; description: string }> = [
  { key: 'tenant:manage', description: 'Criar e gerenciar tenants na plataforma' },
  { key: 'establishment:create', description: 'Criar estabelecimentos' },
  { key: 'establishment:read', description: 'Visualizar estabelecimentos' },
  { key: 'establishment:update', description: 'Editar estabelecimentos' },
  { key: 'establishment:delete', description: 'Remover estabelecimentos' },
  { key: 'user:invite', description: 'Convidar/criar usuários no tenant' },
  { key: 'user:read', description: 'Visualizar usuários do tenant' },
  { key: 'user:update', description: 'Editar usuários do tenant' },
  { key: 'role:assign', description: 'Atribuir papéis a usuários' },

  // Scheduling domain
  { key: 'service:manage', description: 'Criar, editar e remover serviços e categorias' },
  { key: 'service:read', description: 'Visualizar catálogo de serviços' },
  { key: 'employee:manage', description: 'Criar, editar e remover perfis de funcionário' },
  { key: 'employee:read', description: 'Visualizar funcionários e suas agendas' },
  { key: 'employee:schedule:manage_own', description: 'Gerenciar a própria jornada/folgas' },
  { key: 'appointment:create', description: 'Criar agendamentos para qualquer cliente' },
  { key: 'appointment:read', description: 'Visualizar agendamentos do estabelecimento' },
  { key: 'appointment:update', description: 'Editar/reagendar/cancelar qualquer agendamento' },
  { key: 'appointment:create:own', description: 'Criar o próprio agendamento (cliente)' },
  { key: 'appointment:read:own', description: 'Visualizar os próprios agendamentos (cliente)' },
  { key: 'appointment:cancel:own', description: 'Cancelar o próprio agendamento (cliente)' },
  { key: 'appointment:reschedule:own', description: 'Reagendar o próprio agendamento (cliente)' },
  { key: 'agenda:block', description: 'Criar bloqueios manuais na agenda' },
  { key: 'payment:manage', description: 'Registrar e conciliar pagamentos' },
  { key: 'payment:read', description: 'Visualizar pagamentos do estabelecimento' },
  { key: 'waitlist:manage', description: 'Gerenciar a lista de espera do estabelecimento' },
  { key: 'waitlist:create:own', description: 'Entrar na lista de espera (cliente)' },
  {
    key: 'waitlist:read:own',
    description: 'Visualizar as próprias entradas na lista de espera (cliente)',
  },
  {
    key: 'waitlist:cancel:own',
    description: 'Cancelar a própria entrada na lista de espera (cliente)',
  },
  { key: 'review:read', description: 'Visualizar avaliações do estabelecimento' },
  { key: 'review:create:own', description: 'Avaliar o próprio atendimento (cliente)' },
  { key: 'coupon:manage', description: 'Criar e gerenciar cupons de desconto' },
  { key: 'dashboard:read', description: 'Visualizar o resumo diário do estabelecimento' },
  { key: 'report:read', description: 'Visualizar relatórios analíticos do estabelecimento' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'establishment:create',
    'establishment:read',
    'establishment:update',
    'establishment:delete',
    'user:invite',
    'user:read',
    'user:update',
    'role:assign',
    'service:manage',
    'service:read',
    'employee:manage',
    'employee:read',
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'agenda:block',
    'payment:manage',
    'payment:read',
    'waitlist:manage',
    'review:read',
    'coupon:manage',
    'dashboard:read',
    'report:read',
  ],
  manager: [
    'establishment:read',
    'establishment:update',
    'user:invite',
    'user:read',
    'user:update',
    'role:assign',
    'service:manage',
    'service:read',
    'employee:manage',
    'employee:read',
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'agenda:block',
    'payment:manage',
    'payment:read',
    'waitlist:manage',
    'review:read',
    'coupon:manage',
    'dashboard:read',
    'report:read',
  ],
  // Recepção: opera a agenda e recebe pagamentos, mas não configura serviços/funcionários.
  receptionist: [
    'establishment:read',
    'user:read',
    'service:read',
    'employee:read',
    'appointment:create',
    'appointment:read',
    'appointment:update',
    'agenda:block',
    'payment:manage',
    'payment:read',
    'waitlist:manage',
    'review:read',
    'dashboard:read',
    'report:read',
  ],
  // Funcionário: enxerga a própria agenda e o catálogo, gerencia a própria jornada/folgas.
  employee: [
    'establishment:read',
    'user:read',
    'service:read',
    'employee:read',
    'employee:schedule:manage_own',
    'appointment:read',
    'appointment:update',
  ],
  // Cliente: só enxerga/opera sobre os próprios dados — nunca dados de outros clientes.
  // establishment:read/employee:read aqui são leitura ampla do catálogo (não há dado
  // sensível nessas entidades) para sustentar o fluxo de navegação "escolhe estabelecimento
  // -> escolhe profissional" antes de reservar.
  client: [
    'establishment:read',
    'service:read',
    'employee:read',
    'appointment:create:own',
    'appointment:read:own',
    'appointment:cancel:own',
    'appointment:reschedule:own',
    'waitlist:create:own',
    'waitlist:read:own',
    'waitlist:cancel:own',
    'review:create:own',
  ],
};

async function main() {
  const permissionsByKey = new Map<string, string>();
  for (const permission of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
    permissionsByKey.set(created.key, created.id);
  }

  const platformAdminRole = await prisma.role.upsert({
    where: { name: 'platform_admin' },
    update: {},
    create: { name: 'platform_admin', description: 'Administrador da plataforma', isSystem: true },
  });

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `Papel ${roleName}`, isSystem: true },
    });

    for (const key of permissionKeys) {
      const permissionId = permissionsByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  // platform_admin has no tenant-scoped permissions today (it bypasses TenantScopeGuard
  // entirely via users.isPlatformAdmin), but the role row is seeded so future tenant-scoped
  // platform-admin actions have somewhere to attach to.
  void platformAdminRole;

  const adminEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'admin@agendasaas.local';
  const adminPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      isPlatformAdmin: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed concluído. Platform admin: ${adminEmail}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
