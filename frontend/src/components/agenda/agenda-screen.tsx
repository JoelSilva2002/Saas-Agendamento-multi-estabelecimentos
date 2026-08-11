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

import { toDateKey, toTimeKey } from "@/lib/booking/date-utils";
import { getEmployeeEventColors, getStatusClassNames } from "@/lib/agenda/colors";
import { createMockAgendaApi } from "@/lib/agenda/mock-api";
import type { AgendaAppointment, AgendaBlock } from "@/lib/agenda/types";
import { useAsync } from "@/hooks/use-async";

import { AgendaCalendar } from "./agenda-calendar";
import { AgendaLegend } from "./agenda-legend";
import { AgendaToolbar } from "./agenda-toolbar";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";
import { BlockDetailsDialog } from "./block-details-dialog";
import { BlockDialog, type BlockPrefill } from "./block-dialog";
import { FitInDialog, type FitInPrefill } from "./fit-in-dialog";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/catalog";
import type { AgendaViewMode } from "./agenda-view-mode";

type EventExtendedProps =
  | { kind: "appointment"; appointment: AgendaAppointment }
  | { kind: "block"; block: AgendaBlock };

export function AgendaScreen() {
  const [api] = useState(() => createMockAgendaApi());
  const calendarRef = useRef<CalendarRef>(null);

  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(MOCK_EMPLOYEES[0]?.id ?? "");
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

  const dataQuery = useAsync(
    async () => {
      if (!range) return { appointments: [] as AgendaAppointment[], blocks: [] as AgendaBlock[] };
      const [appointments, blocks] = await Promise.all([
        api.listAppointments(range),
        api.listBlocks(range),
      ]);
      return { appointments, blocks };
    },
    [api, range?.fromDate, range?.toDate, refreshKey],
    Boolean(range),
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
      ? appointments.filter((a) => a.employeeId === selectedEmployeeId)
      : appointments;
  const filteredBlocks =
    viewMode === "professional"
      ? blocks.filter((b) => b.employeeId === null || b.employeeId === selectedEmployeeId)
      : blocks;

  const events: EventInput[] = [
    ...filteredAppointments.map((appointment) => ({
      id: `appt-${appointment.id}`,
      title: `${appointment.isFitIn ? "⚡ " : ""}${appointment.clientName} · ${appointment.serviceName}`,
      start: appointment.startAt,
      end: appointment.endAt,
      ...getEmployeeEventColors(appointment.employeeId),
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
        selectedEmployeeId={selectedEmployeeId}
        onSelectedEmployeeChange={setSelectedEmployeeId}
        onOpenFitIn={() => {
          setFitInPrefill(undefined);
          setFitInOpen(true);
        }}
        onOpenBlock={() => {
          setBlockPrefill(undefined);
          setBlockOpen(true);
        }}
      />

      <AgendaLegend />

      <AgendaCalendar
        calendarRef={calendarRef}
        viewMode={viewMode}
        events={events}
        onDatesSet={handleDatesSet}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onSelect={handleSelect}
      />

      <AppointmentDetailsDialog
        appointment={detailsAppointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onConfirm={async (id) => {
          await api.confirmAppointment(id);
          refresh();
        }}
        onNoShow={async (id) => {
          await api.markNoShow(id);
          refresh();
        }}
        onCancel={async (id, reason) => {
          await api.cancelAppointment(id, reason);
          refresh();
        }}
      />

      <FitInDialog
        open={fitInOpen}
        onOpenChange={setFitInOpen}
        prefill={fitInPrefill}
        onSubmit={async (input) => {
          await api.createFitIn(input);
          refresh();
        }}
      />

      <BlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        prefill={blockPrefill}
        onSubmit={async (input) => {
          await api.createBlock(input);
          refresh();
        }}
      />

      <BlockDetailsDialog
        block={blockDetails}
        open={blockDetailsOpen}
        onOpenChange={setBlockDetailsOpen}
        onDelete={async (id) => {
          await api.deleteBlock(id);
          refresh();
        }}
      />
    </div>
  );
}
