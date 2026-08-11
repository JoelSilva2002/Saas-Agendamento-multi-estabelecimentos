import {
  cancelAppointment as cancelAppointmentApi,
  completeAppointment as completeAppointmentApi,
  createAppointment,
  listAppointments as listAppointmentsApi,
  markNoShow as markNoShowApi,
  rescheduleAppointment as rescheduleAppointmentApi,
} from "@/lib/appointments/api";
import type { Appointment } from "@/lib/appointments/types";
import {
  createAgendaBlock as createAgendaBlockApi,
  deleteAgendaBlock as deleteAgendaBlockApi,
  listAgendaBlocks as listAgendaBlocksApi,
} from "@/lib/agenda-blocks/api";
import type { AgendaBlockRecord } from "@/lib/agenda-blocks/types";
import { listServices } from "@/lib/services/api";
import { listTenantUsers } from "@/lib/users/api";
import type {
  AgendaApi,
  AgendaAppointment,
  AgendaBlock,
  CreateBlockInput,
  CreateFitInInput,
  RescheduleInput,
} from "./types";

// The real backend never embeds client/employee/service names on an appointment (see
// AppointmentsController.toAppointmentResponse) — this is the join layer that turns bare
// clientId/employeeId/serviceId into the AgendaAppointment shape the calendar renders.
// Caches names/service lookups for the lifetime of one AgendaScreen mount (rebuilt on
// remount, e.g. navigating away and back) rather than refetching per appointment.
export function createRealAgendaApi(tenantId: string, establishmentId: string): AgendaApi {
  let namesPromise: Promise<Map<string, string>> | null = null;
  let serviceNamesPromise: Promise<Map<string, string>> | null = null;

  function getUserNames(): Promise<Map<string, string>> {
    namesPromise ??= listTenantUsers(tenantId).then(
      (users) => new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()])),
    );
    return namesPromise;
  }

  function getServiceNames(): Promise<Map<string, string>> {
    serviceNamesPromise ??= listServices(tenantId, establishmentId).then(
      (services) => new Map(services.map((s) => [s.id, s.name])),
    );
    return serviceNamesPromise;
  }

  async function hydrate(appointment: Appointment): Promise<AgendaAppointment> {
    const [names, serviceNames] = await Promise.all([getUserNames(), getServiceNames()]);
    return {
      id: appointment.id,
      clientId: appointment.clientId,
      clientName: names.get(appointment.clientId) ?? "Cliente",
      employeeId: appointment.employeeId,
      employeeName: names.get(appointment.employeeId) ?? "Profissional",
      serviceId: appointment.serviceId,
      serviceName: serviceNames.get(appointment.serviceId) ?? "Serviço",
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      priceCents: appointment.priceCents,
      isFitIn: appointment.isFitIn,
      cancellationReason: appointment.cancellationReason,
      cancelledAt: appointment.cancelledAt,
      noShowFeeCents: appointment.noShowFeeCents,
    };
  }

  function toAgendaBlock(block: AgendaBlockRecord): AgendaBlock {
    return {
      id: block.id,
      employeeId: block.employeeId,
      startAt: block.startAt,
      endAt: block.endAt,
      reason: block.reason,
    };
  }

  return {
    async listAppointments(range) {
      const appointments = await listAppointmentsApi(tenantId, establishmentId, {
        fromDate: range.fromDate,
        toDate: range.toDate,
      });
      return Promise.all(appointments.map(hydrate));
    },

    async listBlocks(range) {
      const blocks = await listAgendaBlocksApi(tenantId, establishmentId, {
        fromDate: range.fromDate,
        toDate: range.toDate,
      });
      return blocks.map(toAgendaBlock);
    },

    async createFitIn(input: CreateFitInInput) {
      const appointment = await createAppointment(tenantId, establishmentId, {
        clientId: input.clientId,
        employeeId: input.employeeId,
        serviceId: input.serviceId,
        startAt: input.startAt,
        isFitIn: true,
      });
      return hydrate(appointment);
    },

    async createBlock(input: CreateBlockInput) {
      const block = await createAgendaBlockApi(tenantId, establishmentId, {
        employeeId: input.employeeId,
        startAt: input.startAt,
        endAt: input.endAt,
        reason: input.reason,
      });
      return toAgendaBlock(block);
    },

    async deleteBlock(id: string) {
      await deleteAgendaBlockApi(tenantId, establishmentId, id);
    },

    async markNoShow(id: string) {
      return hydrate(await markNoShowApi(tenantId, establishmentId, id));
    },

    async completeAppointment(id: string) {
      return hydrate(await completeAppointmentApi(tenantId, establishmentId, id));
    },

    async rescheduleAppointment(id: string, input: RescheduleInput) {
      return hydrate(await rescheduleAppointmentApi(tenantId, establishmentId, id, input));
    },

    async cancelAppointment(id: string, reason: string) {
      return hydrate(await cancelAppointmentApi(tenantId, establishmentId, id, reason));
    },
  };
}
