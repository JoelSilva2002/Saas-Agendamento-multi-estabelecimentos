"use client";

import type {
  CalendarRef,
  DateClickInfo,
  DatesSetInfo,
  DateSelectInfo,
  EventClickInfo,
  EventInput,
} from "@fullcalendar/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toDateKey, toTimeKey } from "@/lib/booking/date-utils";
import {
  buildEmployeeColorMap,
  buildEmployeeLegend,
  getAppointmentEventColors,
  getStatusClassNames,
} from "@/lib/agenda/colors";
import { createRealAgendaApi } from "@/lib/agenda/real-api";
import type { AgendaAppointment, AgendaBlock } from "@/lib/agenda/types";
import { getSessionContext } from "@/lib/auth/session-context";
import { listEligibleEmployees, listEmployees } from "@/lib/employees/api";
import { listServices } from "@/lib/services/api";
import { listTenantUsers } from "@/lib/users/api";
import { useAsync } from "@/hooks/use-async";
import { useMediaQuery } from "@/hooks/use-media-query";

import { AgendaCalendar } from "./agenda-calendar";
import { AgendaLegend } from "./agenda-legend";
import { AgendaMobileList } from "./agenda-mobile-list";
import { AgendaToolbar } from "./agenda-toolbar";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";
import { BlockDetailsDialog } from "./block-details-dialog";
import { BlockDialog, type BlockPrefill } from "./block-dialog";
import { FitInDialog, type FitInPrefill } from "./fit-in-dialog";
import type { AgendaViewMode } from "./agenda-view-mode";

type EventExtendedProps =
  | { kind: "appointment"; appointment: AgendaAppointment }
  | { kind: "block"; block: AgendaBlock };

export function AgendaScreen() {
  const [session] = useState(() => getSessionContext());
  const [api] = useState(() =>
    session ? createRealAgendaApi(session.tenantId, session.establishmentId) : null,
  );
  const calendarRef = useRef<CalendarRef>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [range, setRange] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailsAppointment, setDetailsAppointment] = useState<AgendaAppointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [fitInOpen, setFitInOpen] = useState(false);
  const [fitInPrefill, setFitInPrefill] = useState<FitInPrefill | undefined>();

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockPrefill, setBlockPrefill] = useState<BlockPrefill | undefined>();

  const [blockDetails, setBlockDetails] = useState<AgendaBlock | null>(null);
  const [blockDetailsOpen, setBlockDetailsOpen] = useState(false);

  const catalogQuery = useAsync(
    async () => {
      if (!session) throw new Error("Sessão não encontrada");
      const [employees, services, users] = await Promise.all([
        listEmployees(session.tenantId, session.establishmentId),
        listServices(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
      ]);
      const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
      const employeesWithNames = employees.map((employee) => ({
        ...employee,
        displayName: userNames.get(employee.userId) ?? employee.jobTitle,
      }));
      const clients = users.map((u) => ({ id: u.id, displayName: `${u.firstName} ${u.lastName}`.trim() }));
      return { employees: employeesWithNames, services, clients };
    },
    [session?.tenantId, session?.establishmentId],
    Boolean(session),
  );

  const employees = catalogQuery.status === "success" ? catalogQuery.data.employees : [];
  const services = catalogQuery.status === "success" ? catalogQuery.data.services : [];
  const clients = catalogQuery.status === "success" ? catalogQuery.data.clients : [];
  const colorMap = buildEmployeeColorMap(employees);
  const legend = buildEmployeeLegend(colorMap, employees);
  const effectiveSelectedEmployeeId = selectedEmployeeId || employees[0]?.id || "";

  const dataQuery = useAsync(
    async () => {
      if (!api || !range) return { appointments: [] as AgendaAppointment[], blocks: [] as AgendaBlock[] };
      const [appointments, blocks] = await Promise.all([api.listAppointments(range), api.listBlocks(range)]);
      return { appointments, blocks };
    },
    [api, range?.fromDate, range?.toDate, refreshKey],
    Boolean(api && range),
  );

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function handleDatesSet(info: DatesSetInfo) {
    setRange({ fromDate: info.start.toISOString(), toDate: info.end.toISOString() });
  }

  function handleViewModeChange(mode: AgendaViewMode) {
    setViewMode(mode);
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    calendarApi.changeView(
      mode === "day" ? "timeGridDay" : mode === "month" ? "dayGridMonth" : "timeGridWeek",
    );
  }

  function handleGoToDate(dateKey: string) {
    setSelectedDate(dateKey);
    calendarRef.current?.getApi()?.gotoDate(dateKey);
  }

  function handleEventClick(info: EventClickInfo) {
    const props = info.event.extendedProps as EventExtendedProps;
    if (props.kind === "appointment") {
      setDetailsAppointment(props.appointment);
      setDetailsOpen(true);
    } else {
      setBlockDetails(props.block);
      setBlockDetailsOpen(true);
    }
  }

  function handleDateClick(info: DateClickInfo) {
    setFitInPrefill({ date: toDateKey(info.date) });
    setFitInOpen(true);
  }

  function handleSelect(info: DateSelectInfo) {
    setFitInPrefill({ date: toDateKey(info.start), time: toTimeKey(info.start) });
    setFitInOpen(true);
  }

  const appointments = dataQuery.status === "success" ? dataQuery.data.appointments : [];
  const blocks = dataQuery.status === "success" ? dataQuery.data.blocks : [];

  const filteredAppointments =
    viewMode === "professional"
      ? appointments.filter((a) => a.employeeId === effectiveSelectedEmployeeId)
      : appointments;
  const filteredBlocks =
    viewMode === "professional"
      ? blocks.filter((b) => b.employeeId === null || b.employeeId === effectiveSelectedEmployeeId)
      : blocks;

  const events: EventInput[] = [
    ...filteredAppointments.map((appointment) => ({
      id: `appt-${appointment.id}`,
      title: `${appointment.isFitIn ? "⚡ " : ""}${appointment.clientName} · ${appointment.serviceName}`,
      start: appointment.startAt,
      end: appointment.endAt,
      ...getAppointmentEventColors(colorMap, appointment.employeeId, appointment.status),
      classNames: getStatusClassNames(appointment.status),
      extendedProps: { kind: "appointment", appointment } satisfies EventExtendedProps,
    })),
    ...filteredBlocks.map((block) => ({
      id: `block-${block.id}`,
      title: block.reason ? `🔒 ${block.reason}` : "🔒 Bloqueado",
      start: block.startAt,
      end: block.endAt,
      backgroundColor: "var(--muted)",
      borderColor: "var(--border)",
      textColor: "var(--muted-foreground)",
      extendedProps: { kind: "block", block } satisfies EventExtendedProps,
    })),
  ];

  if (!session || !api) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const isInitialLoading = catalogQuery.status === "loading" || catalogQuery.status === "idle";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e gerencie os agendamentos do estabelecimento.
        </p>
      </div>

      <AgendaToolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        employees={employees}
        selectedEmployeeId={effectiveSelectedEmployeeId}
        onSelectedEmployeeChange={setSelectedEmployeeId}
        selectedDate={selectedDate}
        onDateChange={handleGoToDate}
        onOpenFitIn={() => {
          setFitInPrefill(undefined);
          setFitInOpen(true);
        }}
        onOpenBlock={() => {
          setBlockPrefill(undefined);
          setBlockOpen(true);
        }}
      />

      <AgendaLegend legend={legend} />

      {isInitialLoading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : isMobile ? (
        <AgendaMobileList
          date={selectedDate}
          onDateChange={handleGoToDate}
          appointments={filteredAppointments}
          blocks={filteredBlocks}
          colorMap={colorMap}
          onAppointmentClick={(appointment) => {
            setDetailsAppointment(appointment);
            setDetailsOpen(true);
          }}
          onBlockClick={(block) => {
            setBlockDetails(block);
            setBlockDetailsOpen(true);
          }}
        />
      ) : (
        <AgendaCalendar
          calendarRef={calendarRef}
          viewMode={viewMode}
          events={events}
          onDatesSet={handleDatesSet}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onSelect={handleSelect}
        />
      )}

      <AppointmentDetailsDialog
        appointment={detailsAppointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onComplete={async (id) => {
          await api.completeAppointment(id);
          toast.success("Agendamento concluído");
          refresh();
        }}
        onReschedule={async (id, input) => {
          await api.rescheduleAppointment(id, input);
          toast.success("Agendamento reagendado");
          refresh();
        }}
        onNoShow={async (id) => {
          await api.markNoShow(id);
          toast.success("Falta registrada");
          refresh();
        }}
        onCancel={async (id, reason) => {
          await api.cancelAppointment(id, reason);
          toast.success("Agendamento cancelado");
          refresh();
        }}
      />

      <FitInDialog
        open={fitInOpen}
        onOpenChange={setFitInOpen}
        prefill={fitInPrefill}
        clients={clients}
        services={services}
        employees={employees}
        getEligibleEmployeeIds={async (serviceId) => {
          const eligible = await listEligibleEmployees(session.tenantId, session.establishmentId, serviceId);
          return eligible.map((e) => e.id);
        }}
        onSubmit={async (input) => {
          await api.createFitIn(input);
          toast.success("Encaixe criado");
          refresh();
        }}
      />

      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        prefill={blockPrefill}
        employees={employees}
        onSubmit={async (input) => {
          await api.createBlock(input);
          toast.success("Horário bloqueado");
          refresh();
        }}
      />

      <BlockDetailsDialog
        block={blockDetails}
        open={blockDetailsOpen}
        onOpenChange={setBlockDetailsOpen}
        employees={employees}
        onDelete={async (id) => {
          await api.deleteBlock(id);
          toast.success("Bloqueio removido");
          refresh();
        }}
      />
    </div>
  );
}
