// Fase 27 (deploy de portfólio): povoa o banco com dois estabelecimentos fictícios completos —
// serviços, funcionários com jornada, clientes, agendamentos passados e futuros, avaliações e
// cupons — para que o link público não abra em telas vazias. Separado de prisma/seed.ts (que
// continua sendo pré-requisito: RBAC + admin de plataforma) porque um é dado de sistema e o
// outro é dado de vitrine — não faz sentido rodar este último num ambiente com clientes reais.
//
// Idempotência: todo registro usa um ID determinístico (prefixo "demo-") e é gravado via upsert.
// A maioria destes modelos não tem uma chave de negócio natural para upsert (Service, Appointment
// avulso, etc.), então o ID passa a fazer esse papel — rodar de novo atualiza em vez de duplicar.
//
// Datas são relativas a `now()` a cada execução — de propósito, para a agenda nunca "envelhecer".
// Isso também significa que os horários exatos dos agendamentos mudam a cada rerun; só a forma
// geral (passado concluído/cancelado, futuro confirmado/pendente) é preservada.
import {
  PrismaClient,
  AppointmentStatus,
  CouponDiscountType,
  CouponStatus,
  ScheduleSlotType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { timeStringToDate } from '../src/shared-kernel/infrastructure/time-of-day.util';

const prisma = new PrismaClient();

// Compartilhada por todas as contas de demonstração (dono, funcionários, clientes) — evita
// re-hashear (argon2 é deliberadamente caro) uma senha por usuário quando o valor é o mesmo.
const DEMO_PASSWORD = 'Demo1234!';

const HOUR_SLOTS: Array<[number, number]> = [
  [9, 0],
  [10, 30],
  [13, 0],
  [14, 30],
  [16, 0],
  [17, 30],
];

const PAST_PER_EMPLOYEE = 7;
const FUTURE_PER_EMPLOYEE = 2;
const PAST_WINDOW_DAYS = 30;
const FUTURE_WINDOW_DAYS = 14;

const CANCELLATION_REASONS = [
  'Imprevisto pessoal',
  'Conflito de horário no trabalho',
  'Não poderá comparecer',
  'Remarcação a pedido do cliente',
];

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Atendimento excelente, super recomendo!',
    'Profissional muito atencioso, adorei o resultado.',
    'Sempre saio satisfeito(a), ambiente ótimo.',
  ],
  4: ['Muito bom, só demorou um pouco além do horário.', 'Gostei bastante, voltarei com certeza.'],
  3: ['Ficou bom, mas esperava um pouco mais.', 'Atendimento ok, nada excepcional.'],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

// Faixa Unicode dos diacríticos combinantes (á -> "a" + acento) deixados por normalize('NFD').
// Construída a partir de códigos de caractere (não um literal/escape no código-fonte) de
// propósito: um caractere combinante colado direto num regex é ilegível e confunde editores e o
// eslint (no-misleading-character-class).
const COMBINING_DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function atLocalTime(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Distintos offsets de dia (a partir de hoje), pulando domingo (fechado). `direction` é -1
 * para o passado e +1 para o futuro — precisa ser aplicado aqui, e não só no chamador, porque
 * é o dia resultante (hoje ± offset) que precisa cair fora de domingo, não hoje. */
function pickDayOffsets(count: number, maxOffset: number, direction: 1 | -1): number[] {
  const offsets = new Set<number>();
  let guard = 0;
  while (offsets.size < count && guard < 500) {
    guard++;
    const offset = randomInt(1, maxOffset);
    if (addDays(new Date(), direction * offset).getDay() === 0) continue;
    offsets.add(offset);
  }
  return [...offsets];
}

function pickPastStatus(): AppointmentStatus {
  const r = Math.random();
  if (r < 0.7) return AppointmentStatus.completed;
  if (r < 0.85) return AppointmentStatus.cancelled;
  return AppointmentStatus.no_show;
}

function pickFutureStatus(): AppointmentStatus {
  return Math.random() < 0.7 ? AppointmentStatus.confirmed : AppointmentStatus.pending;
}

function pickRating(): number {
  const r = Math.random();
  if (r < 0.55) return 5;
  if (r < 0.85) return 4;
  return 3;
}

interface DemoPerson {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface DemoEmployee extends DemoPerson {
  employeeId: string;
  jobTitle: string;
}

interface DemoClient extends DemoPerson {
  clientProfileId: string;
  phone: string;
  birthYearsAgo: number;
}

interface DemoCategory {
  id: string;
  name: string;
  displayOrder: number;
}

interface DemoService {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

interface EstablishmentBlueprint {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
  description: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  phones: string[];
  owner: DemoPerson;
  employees: DemoEmployee[];
  categories: DemoCategory[];
  services: DemoService[];
  clients: DemoClient[];
  couponId: string;
  couponCode: string;
  couponDiscountType: CouponDiscountType;
  couponDiscountValue: number;
}

function person(fullName: string, emailLocalPrefix: string): DemoPerson {
  const [firstName, ...rest] = fullName.split(' ');
  return {
    id: `demo-user-${slugify(fullName)}`,
    userId: `demo-user-${slugify(fullName)}`,
    email: `${emailLocalPrefix}@demo.agendasaas.local`,
    firstName,
    lastName: rest.join(' '),
  };
}

function employee(fullName: string, jobTitle: string): DemoEmployee {
  const base = person(fullName, slugify(fullName));
  return {
    ...base,
    employeeId: `demo-emp-${slugify(fullName)}`,
    jobTitle,
  };
}

function client(fullName: string, phone: string, birthYearsAgo: number): DemoClient {
  const base = person(fullName, slugify(fullName));
  return {
    ...base,
    clientProfileId: `demo-clientprofile-${slugify(fullName)}`,
    phone,
    birthYearsAgo,
  };
}

const BARBEARIA: EstablishmentBlueprint = {
  tenantId: 'demo-tenant-barbearia-vintage',
  tenantName: 'Barbearia Vintage',
  tenantSlug: 'demo-barbearia-vintage',
  establishmentId: 'demo-est-barbearia-vintage',
  establishmentName: 'Barbearia Vintage',
  establishmentSlug: 'barbearia-vintage',
  description:
    'Barbearia especializada em cortes clássicos e modernos, com ambiente aconchegante e ' +
    'atendimento personalizado. Do fade ao navalhado, cuidamos do seu visual com atenção aos detalhes.',
  addressStreet: 'Rua Augusta',
  addressNumber: '1200',
  addressNeighborhood: 'Consolação',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01305-100',
  phones: ['+55 11 91234-5678', '+55 11 3456-7890'],
  owner: person('Roberto Carlos Menezes', 'barbearia.dono'),
  employees: [
    employee('Carlos Eduardo Martins', 'Barbeiro Sênior'),
    employee('João Vitor Nascimento', 'Barbeiro'),
    employee('André Luiz Cardoso', 'Barbeiro'),
  ],
  categories: [
    { id: 'demo-cat-barbearia-cortes', name: 'Cortes', displayOrder: 0 },
    { id: 'demo-cat-barbearia-barba', name: 'Barba', displayOrder: 1 },
    { id: 'demo-cat-barbearia-combos', name: 'Combos', displayOrder: 2 },
  ],
  services: [
    {
      id: 'demo-svc-barbearia-corte-masculino',
      categoryId: 'demo-cat-barbearia-cortes',
      name: 'Corte Masculino',
      priceCents: 4000,
      durationMinutes: 45,
    },
    {
      id: 'demo-svc-barbearia-corte-degrade',
      categoryId: 'demo-cat-barbearia-cortes',
      name: 'Corte Degradê',
      priceCents: 4500,
      durationMinutes: 45,
    },
    {
      id: 'demo-svc-barbearia-sobrancelha',
      categoryId: 'demo-cat-barbearia-cortes',
      name: 'Sobrancelha',
      priceCents: 1500,
      durationMinutes: 15,
    },
    {
      id: 'demo-svc-barbearia-barba-completa',
      categoryId: 'demo-cat-barbearia-barba',
      name: 'Barba Completa',
      priceCents: 2500,
      durationMinutes: 30,
    },
    {
      id: 'demo-svc-barbearia-pezinho',
      categoryId: 'demo-cat-barbearia-barba',
      name: 'Pézinho',
      priceCents: 1000,
      durationMinutes: 15,
    },
    {
      id: 'demo-svc-barbearia-corte-barba',
      categoryId: 'demo-cat-barbearia-combos',
      name: 'Corte + Barba',
      priceCents: 6000,
      durationMinutes: 60,
    },
  ],
  clients: [
    client('Lucas Silva', '+55 11 98111-0001', 28),
    client('Pedro Santos', '+55 11 98111-0002', 34),
    client('Gabriel Oliveira', '+55 11 98111-0003', 22),
    client('Matheus Souza', '+55 11 98111-0004', 41),
    client('Rafael Ferreira', '+55 11 98111-0005', 30),
    client('Bruno Almeida', '+55 11 98111-0006', 26),
    client('Thiago Pereira', '+55 11 98111-0007', 37),
  ],
  couponId: 'demo-coupon-barbearia-bemvindo10',
  couponCode: 'BEMVINDO10',
  couponDiscountType: CouponDiscountType.percentage,
  couponDiscountValue: 10,
};

const SALAO: EstablishmentBlueprint = {
  tenantId: 'demo-tenant-espaco-bella',
  tenantName: 'Espaço Bella Salão',
  tenantSlug: 'demo-espaco-bella',
  establishmentId: 'demo-est-espaco-bella',
  establishmentName: 'Espaço Bella Salão',
  establishmentSlug: 'espaco-bella-salao',
  description:
    'Salão de beleza completo com cabelo, estética e unhas em um só lugar. Nossa equipe é ' +
    'especializada em transformar seu visual com técnicas atualizadas e produtos de qualidade.',
  addressStreet: 'Av. Paulista',
  addressNumber: '900',
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
  phones: ['+55 11 98765-4321'],
  owner: person('Camila Fernandes Duarte', 'salao.dona'),
  employees: [
    employee('Fernanda Cristina Rocha', 'Cabeleireira'),
    employee('Juliana Aparecida Souza', 'Manicure'),
    employee('Patrícia Helena Vieira', 'Esteticista'),
  ],
  categories: [
    { id: 'demo-cat-salao-cabelo', name: 'Cabelo', displayOrder: 0 },
    { id: 'demo-cat-salao-estetica', name: 'Estética', displayOrder: 1 },
    { id: 'demo-cat-salao-unhas', name: 'Unhas', displayOrder: 2 },
  ],
  services: [
    {
      id: 'demo-svc-salao-escova',
      categoryId: 'demo-cat-salao-cabelo',
      name: 'Escova',
      priceCents: 5000,
      durationMinutes: 45,
    },
    {
      id: 'demo-svc-salao-corte-feminino',
      categoryId: 'demo-cat-salao-cabelo',
      name: 'Corte Feminino',
      priceCents: 7000,
      durationMinutes: 60,
    },
    {
      id: 'demo-svc-salao-hidratacao',
      categoryId: 'demo-cat-salao-cabelo',
      name: 'Hidratação Capilar',
      priceCents: 9000,
      durationMinutes: 60,
    },
    {
      id: 'demo-svc-salao-design-sobrancelha',
      categoryId: 'demo-cat-salao-estetica',
      name: 'Design de Sobrancelha',
      priceCents: 3000,
      durationMinutes: 30,
    },
    {
      id: 'demo-svc-salao-manicure',
      categoryId: 'demo-cat-salao-unhas',
      name: 'Manicure',
      priceCents: 3500,
      durationMinutes: 45,
    },
    {
      id: 'demo-svc-salao-pedicure',
      categoryId: 'demo-cat-salao-unhas',
      name: 'Pedicure',
      priceCents: 4000,
      durationMinutes: 45,
    },
  ],
  clients: [
    client('Ana Costa', '+55 11 98222-0001', 29),
    client('Beatriz Gomes', '+55 11 98222-0002', 33),
    client('Camila Ribeiro', '+55 11 98222-0003', 24),
    client('Fernanda Carvalho', '+55 11 98222-0004', 45),
    client('Juliana Lima', '+55 11 98222-0005', 31),
    client('Larissa Araújo', '+55 11 98222-0006', 27),
    client('Mariana Melo', '+55 11 98222-0007', 38),
    client('Vanessa Rocha', '+55 11 98222-0008', 35),
  ],
  couponId: 'demo-coupon-salao-primeira15',
  couponCode: 'PRIMEIRAVISITA15',
  couponDiscountType: CouponDiscountType.percentage,
  couponDiscountValue: 15,
};

async function upsertUser(p: DemoPerson, passwordHash: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: p.id },
    update: { email: p.email, firstName: p.firstName, lastName: p.lastName },
    create: {
      id: p.id,
      email: p.email,
      passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
    },
  });
}

async function upsertMembership(
  id: string,
  userId: string,
  tenantId: string,
  establishmentId: string | null,
  roleId: string,
): Promise<void> {
  await prisma.userTenantRole.upsert({
    where: { id },
    update: { roleId, establishmentId },
    create: { id, userId, tenantId, establishmentId, roleId },
  });
}

async function seedEstablishment(
  blueprint: EstablishmentBlueprint,
  roleIds: { owner: string; employee: string; client: string },
  passwordHash: string,
): Promise<void> {
  // Tenant + estabelecimento -----------------------------------------------------------
  await prisma.tenant.upsert({
    where: { id: blueprint.tenantId },
    update: { name: blueprint.tenantName },
    create: { id: blueprint.tenantId, name: blueprint.tenantName, slug: blueprint.tenantSlug },
  });

  await prisma.establishment.upsert({
    where: { id: blueprint.establishmentId },
    update: {
      description: blueprint.description,
      addressStreet: blueprint.addressStreet,
      addressNumber: blueprint.addressNumber,
      addressNeighborhood: blueprint.addressNeighborhood,
      addressCity: blueprint.addressCity,
      addressState: blueprint.addressState,
      addressZipCode: blueprint.addressZipCode,
      phones: blueprint.phones,
    },
    create: {
      id: blueprint.establishmentId,
      tenantId: blueprint.tenantId,
      name: blueprint.establishmentName,
      slug: blueprint.establishmentSlug,
      description: blueprint.description,
      addressStreet: blueprint.addressStreet,
      addressNumber: blueprint.addressNumber,
      addressNeighborhood: blueprint.addressNeighborhood,
      addressCity: blueprint.addressCity,
      addressState: blueprint.addressState,
      addressZipCode: blueprint.addressZipCode,
      phones: blueprint.phones,
    },
  });

  // Horário de funcionamento: fechado domingo, 09:00-19:00 de segunda a sábado -----------
  for (let weekday = 0; weekday <= 6; weekday++) {
    const isClosed = weekday === 0;
    await prisma.establishmentBusinessHours.upsert({
      where: { id: `${blueprint.establishmentId}-bh-${weekday}` },
      update: {
        isClosed,
        openTime: isClosed ? null : timeStringToDate('09:00'),
        closeTime: isClosed ? null : timeStringToDate('19:00'),
      },
      create: {
        id: `${blueprint.establishmentId}-bh-${weekday}`,
        establishmentId: blueprint.establishmentId,
        weekday,
        isClosed,
        openTime: isClosed ? null : timeStringToDate('09:00'),
        closeTime: isClosed ? null : timeStringToDate('19:00'),
      },
    });
  }

  // Dono ------------------------------------------------------------------------------
  await upsertUser(blueprint.owner, passwordHash);
  await upsertMembership(
    `demo-membership-${blueprint.owner.id}`,
    blueprint.owner.userId,
    blueprint.tenantId,
    null, // owner: papel vale para o tenant inteiro, não um estabelecimento específico
    roleIds.owner,
  );

  // Categorias e serviços --------------------------------------------------------------
  for (const category of blueprint.categories) {
    await prisma.serviceCategory.upsert({
      where: { id: category.id },
      update: { name: category.name, displayOrder: category.displayOrder },
      create: {
        id: category.id,
        establishmentId: blueprint.establishmentId,
        name: category.name,
        displayOrder: category.displayOrder,
      },
    });
  }

  for (const service of blueprint.services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: {
        name: service.name,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
        categoryId: service.categoryId,
      },
      create: {
        id: service.id,
        establishmentId: blueprint.establishmentId,
        categoryId: service.categoryId,
        name: service.name,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
      },
    });
  }

  // Funcionários: usuário + perfil + jornada (09-19, com pausa de almoço) + elegibilidade
  // para todos os serviços do estabelecimento (negócio pequeno, sem especialização estrita) --
  for (const emp of blueprint.employees) {
    await upsertUser(emp, passwordHash);
    await upsertMembership(
      `demo-membership-${emp.id}`,
      emp.userId,
      blueprint.tenantId,
      blueprint.establishmentId,
      roleIds.employee,
    );

    await prisma.employee.upsert({
      where: { id: emp.employeeId },
      update: { jobTitle: emp.jobTitle },
      create: {
        id: emp.employeeId,
        establishmentId: blueprint.establishmentId,
        userId: emp.userId,
        jobTitle: emp.jobTitle,
        hiredAt: addDays(new Date(), -400),
      },
    });

    for (const service of blueprint.services) {
      await prisma.serviceEmployee.upsert({
        where: { serviceId_employeeId: { serviceId: service.id, employeeId: emp.employeeId } },
        update: {},
        create: { serviceId: service.id, employeeId: emp.employeeId },
      });
    }

    for (let weekday = 1; weekday <= 6; weekday++) {
      await prisma.employeeScheduleSlot.upsert({
        where: { id: `${emp.employeeId}-work-${weekday}` },
        update: {
          startTime: timeStringToDate('09:00')!,
          endTime: timeStringToDate('19:00')!,
        },
        create: {
          id: `${emp.employeeId}-work-${weekday}`,
          employeeId: emp.employeeId,
          weekday,
          slotType: ScheduleSlotType.working,
          startTime: timeStringToDate('09:00')!,
          endTime: timeStringToDate('19:00')!,
        },
      });
      await prisma.employeeScheduleSlot.upsert({
        where: { id: `${emp.employeeId}-break-${weekday}` },
        update: {
          startTime: timeStringToDate('12:00')!,
          endTime: timeStringToDate('13:00')!,
        },
        create: {
          id: `${emp.employeeId}-break-${weekday}`,
          employeeId: emp.employeeId,
          weekday,
          slotType: ScheduleSlotType.break,
          startTime: timeStringToDate('12:00')!,
          endTime: timeStringToDate('13:00')!,
        },
      });
    }
  }

  // Clientes ----------------------------------------------------------------------------
  for (const c of blueprint.clients) {
    await upsertUser(c, passwordHash);
    await upsertMembership(
      `demo-membership-${c.id}`,
      c.userId,
      blueprint.tenantId,
      blueprint.establishmentId,
      roleIds.client,
    );
    await prisma.clientProfile.upsert({
      where: { id: c.clientProfileId },
      update: { phone: c.phone },
      create: {
        id: c.clientProfileId,
        establishmentId: blueprint.establishmentId,
        userId: c.userId,
        phone: c.phone,
        birthDate: addDays(new Date(), -c.birthYearsAgo * 365),
      },
    });
  }

  // Cupom ---------------------------------------------------------------------------------
  await prisma.coupon.upsert({
    where: { id: blueprint.couponId },
    update: {
      validFrom: addDays(new Date(), -30),
      validUntil: addDays(new Date(), 90),
      status: CouponStatus.active,
    },
    create: {
      id: blueprint.couponId,
      tenantId: blueprint.tenantId,
      establishmentId: blueprint.establishmentId,
      code: blueprint.couponCode,
      discountType: blueprint.couponDiscountType,
      discountValue: blueprint.couponDiscountValue,
      maxUses: 100,
      validFrom: addDays(new Date(), -30),
      validUntil: addDays(new Date(), 90),
      status: CouponStatus.active,
    },
  });

  // Agendamentos: passado (concluído/cancelado/faltou) + futuro (confirmado/pendente) -----
  // Cada funcionário recebe seus próprios offsets de dia, distintos dentro de cada janela —
  // isso é o que garante que nunca colidam com a exclusão anti-overlap do banco (que é por
  // employee_id): grade de horários fixa (90 min de intervalo) + dias distintos por
  // funcionário elimina qualquer sobreposição sem precisar consultar o banco antes de gravar.
  for (const emp of blueprint.employees) {
    const pastOffsets = pickDayOffsets(PAST_PER_EMPLOYEE, PAST_WINDOW_DAYS, -1);
    for (const [i, offset] of pastOffsets.entries()) {
      const [hour, minute] = HOUR_SLOTS[i % HOUR_SLOTS.length];
      const day = addDays(new Date(), -offset);
      const service = pickRandom(blueprint.services);
      const clientPerson = pickRandom(blueprint.clients);
      const startAt = atLocalTime(day, hour, minute);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
      const status = pickPastStatus();
      const appointmentId = `demo-apt-${blueprint.establishmentSlug}-${emp.employeeId}-past-${i}`;

      await seedAppointment({
        id: appointmentId,
        establishmentId: blueprint.establishmentId,
        clientId: clientPerson.userId,
        employeeId: emp.employeeId,
        serviceId: service.id,
        startAt,
        endAt,
        priceCents: service.priceCents,
        status,
      });

      if (status === AppointmentStatus.completed && Math.random() < 0.75) {
        const rating = pickRating();
        const comments = REVIEW_COMMENTS[rating] ?? [];
        await prisma.review.upsert({
          where: { id: `demo-review-${appointmentId}` },
          update: { rating },
          create: {
            id: `demo-review-${appointmentId}`,
            establishmentId: blueprint.establishmentId,
            appointmentId,
            clientId: clientPerson.userId,
            employeeId: emp.employeeId,
            rating,
            comment: comments.length > 0 ? pickRandom(comments) : null,
          },
        });
      }
    }

    const futureOffsets = pickDayOffsets(FUTURE_PER_EMPLOYEE, FUTURE_WINDOW_DAYS, 1);
    for (const [i, offset] of futureOffsets.entries()) {
      const [hour, minute] = HOUR_SLOTS[i % HOUR_SLOTS.length];
      const day = addDays(new Date(), offset);
      const service = pickRandom(blueprint.services);
      const clientPerson = pickRandom(blueprint.clients);
      const startAt = atLocalTime(day, hour, minute);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
      const appointmentId = `demo-apt-${blueprint.establishmentSlug}-${emp.employeeId}-future-${i}`;

      await seedAppointment({
        id: appointmentId,
        establishmentId: blueprint.establishmentId,
        clientId: clientPerson.userId,
        employeeId: emp.employeeId,
        serviceId: service.id,
        startAt,
        endAt,
        priceCents: service.priceCents,
        status: pickFutureStatus(),
      });
    }
  }
}

interface AppointmentSeed {
  id: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  priceCents: number;
  status: AppointmentStatus;
}

async function seedAppointment(a: AppointmentSeed): Promise<void> {
  const isCancelled = a.status === AppointmentStatus.cancelled;
  await prisma.appointment.upsert({
    where: { id: a.id },
    update: {
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      cancellationReason: isCancelled ? pickRandom(CANCELLATION_REASONS) : null,
      cancelledAt: isCancelled ? a.startAt : null,
      cancelledById: isCancelled ? a.clientId : null,
    },
    create: {
      id: a.id,
      establishmentId: a.establishmentId,
      clientId: a.clientId,
      employeeId: a.employeeId,
      serviceId: a.serviceId,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      priceCents: a.priceCents,
      // Auto-agendado pelo próprio cliente (fluxo público) — o caminho que a demo mais mostra.
      createdById: a.clientId,
      cancellationReason: isCancelled ? pickRandom(CANCELLATION_REASONS) : null,
      cancelledAt: isCancelled ? a.startAt : null,
      cancelledById: isCancelled ? a.clientId : null,
    },
  });
}

async function main(): Promise<void> {
  const [ownerRole, employeeRole, clientRole] = await Promise.all([
    prisma.role.findUnique({ where: { name: 'owner' } }),
    prisma.role.findUnique({ where: { name: 'employee' } }),
    prisma.role.findUnique({ where: { name: 'client' } }),
  ]);
  if (!ownerRole || !employeeRole || !clientRole) {
    throw new Error(
      'Papéis do RBAC (owner/employee/client) não encontrados — rode `npm run prisma:seed` ' +
        'antes deste script.',
    );
  }
  const roleIds = { owner: ownerRole.id, employee: employeeRole.id, client: clientRole.id };

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  await seedEstablishment(BARBEARIA, roleIds, passwordHash);
  await seedEstablishment(SALAO, roleIds, passwordHash);

  // eslint-disable-next-line no-console
  console.log('Seed de demonstração concluído.');
  // eslint-disable-next-line no-console
  console.log(`Senha compartilhada por todas as contas de demonstração: ${DEMO_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`Dono (${BARBEARIA.establishmentName}): ${BARBEARIA.owner.email}`);
  // eslint-disable-next-line no-console
  console.log(`Dono (${SALAO.establishmentName}): ${SALAO.owner.email}`);
  // eslint-disable-next-line no-console
  console.log(`Cliente de exemplo: ${BARBEARIA.clients[0].email}`);
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
