import { toDateKey } from "@/lib/booking/date-utils";
import {
  ELIGIBLE_EMPLOYEES_BY_SERVICE,
  MOCK_CLIENTS,
  MOCK_EMPLOYEES,
  MOCK_SERVICES,
} from "@/lib/mock-data/catalog";
import { delay, randomId, seededRandom } from "@/lib/mock-data/mock-utils";
import type { AgendaApi, AgendaAppointment, AgendaBlock, AppointmentStatus } from "./types";

const CANDIDATE_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];
const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
const NO_SHOW_FEE_PERCENTAGE = 30;

function buildSeedAppointments(): AgendaAppointment[] {
  const appointments: AgendaAppointment[] = [];
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = -10; dayOffset <= 18; dayOffset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayOffset);
    if (day.getDay() === 0) continue; // closed Sundays

    for (const employee of MOCK_EMPLOYEES) {
      const eligibleServices = MOCK_SERVICES.filter((s) =>
        ELIGIBLE_EMPLOYEES_BY_SERVICE[s.id]?.includes(employee.id),
      );
      if (eligibleServices.length === 0) continue;

      const rand = seededRandom(`${employee.id}:${toDateKey(day)}`);
      for (const hour of CANDIDATE_HOURS) {
        if (rand() < 0.55) continue; // sparse, realistic-looking schedule

        const service = eligibleServices[Math.floor(rand() * eligibleServices.length)];
        const client = MOCK_CLIENTS[Math.floor(rand() * MOCK_CLIENTS.length)];
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + service.durationMinutes * 60_000);
        const priceCents = Math.round(service.price * 100);

        let status: AppointmentStatus = "pending";
        if (end < now) {
          const r = rand();
          status = r < 0.75 ? "completed" : r < 0.9 ? "no_show" : "cancelled";
        } else if (rand() < 0.1) {
          status = "cancelled";
        }

        appointments.push({
          id: randomId("appt"),
          clientId: client.id,
          clientName: client.displayName,
          employeeId: employee.id,
          employeeName: employee.displayName,
          serviceId: service.id,
          serviceName: service.name,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status,
          priceCents,
          isFitIn: rand() < 0.12,
          cancellationReason: status === "cancelled" ? "Cliente solicitou cancelamento" : null,
          cancelledAt: status === "cancelled" ? start.toISOString() : null,
          noShowFeeCents:
            status === "no_show" ? Math.round((priceCents * NO_SHOW_FEE_PERCENTAGE) / 100) : null,
        });
      }
    }
  }

  return appointments;
}

export function createMockAgendaApi(): AgendaApi {
  let appointments = buildSeedAppointments();
  let blocks: AgendaBlock[] = [];

  function getAppointmentOrThrow(id: string): AgendaAppointment {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) throw new Error("Agendamento não encontrado");
    return appointment;
  }

  function assertNotTerminal(appointment: AgendaAppointment) {
    if (TERMINAL_STATUSES.includes(appointment.status)) {
      throw new Error("Este agendamento já está em um estado final e não pode ser alterado");
    }
  }

  function updateAppointment(id: string, patch: Partial<AgendaAppointment>): AgendaAppointment {
    let updated: AgendaAppointment | undefined;
    appointments = appointments.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...patch };
      return updated;
    });
    if (!updated) throw new Error("Agendamento não encontrado");
    return updated;
  }

  return {
    async listAppointments({ fromDate, toDate }) {
      await delay(400);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return appointments.filter((a) => {
        const start = new Date(a.startAt);
        return start >= from && start < to;
      });
    },

    async listBlocks({ fromDate, toDate }) {
      await delay(300);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return blocks.filter((b) => {
        const start = new Date(b.startAt);
        return start >= from && start < to;
      });
    },

    async createFitIn({ clientId, serviceId, employeeId, startAt }) {
      await delay(500);
      const service = MOCK_SERVICES.find((s) => s.id === serviceId);
      if (!service) throw new Error("Serviço não encontrado");
      const employee = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
      if (!employee) throw new Error("Profissional não encontrado");
      const client = MOCK_CLIENTS.find((c) => c.id === clientId);
      if (!client) throw new Error("Cliente não encontrado");

      const start = new Date(startAt);
      const end = new Date(start.getTime() + service.durationMinutes * 60_000);
      const appointment: AgendaAppointment = {
        id: randomId("appt"),
        clientId,
        clientName: client.displayName,
        employeeId,
        employeeName: employee.displayName,
        serviceId,
        serviceName: service.name,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: "pending",
        priceCents: Math.round(service.price * 100),
        isFitIn: true,
        cancellationReason: null,
        cancelledAt: null,
        noShowFeeCents: null,
      };
      appointments = [...appointments, appointment];
      return appointment;
    },

    async createBlock({ employeeId, startAt, endAt, reason }) {
      await delay(400);
      const block: AgendaBlock = {
        id: randomId("block"),
        employeeId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        reason: reason?.trim() || null,
      };
      blocks = [...blocks, block];
      return block;
    },

    async deleteBlock(id) {
      await delay(300);
      blocks = blocks.filter((b) => b.id !== id);
    },

    async confirmAppointment(id) {
      await delay(400);
      const appointment = getAppointmentOrThrow(id);
      assertNotTerminal(appointment);
      return updateAppointment(id, { status: "confirmed" });
    },

    async markNoShow(id) {
      await delay(400);
      const appointment = getAppointmentOrThrow(id);
      assertNotTerminal(appointment);
      if (new Date(appointment.startAt) > new Date()) {
        throw new Error("Só é possível marcar falta após o horário do agendamento");
      }
      const noShowFeeCents = Math.round((appointment.priceCents * NO_SHOW_FEE_PERCENTAGE) / 100);
      return updateAppointment(id, { status: "no_show", noShowFeeCents });
    },

    async cancelAppointment(id, reason) {
      await delay(400);
      if (!reason.trim()) throw new Error("Informe o motivo do cancelamento");
      const appointment = getAppointmentOrThrow(id);
      assertNotTerminal(appointment);
      return updateAppointment(id, {
        status: "cancelled",
        cancellationReason: reason.trim(),
        cancelledAt: new Date().toISOString(),
      });
    },
  };
}
