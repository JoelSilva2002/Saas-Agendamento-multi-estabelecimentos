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
  ],
  manager: [
    'establishment:read',
    'establishment:update',
    'user:invite',
    'user:read',
    'user:update',
    'role:assign',
  ],
  employee: ['establishment:read', 'user:read'],
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
