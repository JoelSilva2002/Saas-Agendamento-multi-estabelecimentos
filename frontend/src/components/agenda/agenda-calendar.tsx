"use client";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/breezy/theme.css";

import {
  Calendar,
  type CalendarRef,
  type DateClickInfo,
  type DatesSetInfo,
  type DateSelectInfo,
  type EventClickInfo,
  type EventInput,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import ptBrLocale from "@fullcalendar/react/locales/pt-br";
import breezyTheme from "@fullcalendar/react/themes/breezy";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { type Ref } from "react";

import type { AgendaViewMode } from "./agenda-view-mode";

const VIEW_MODE_TO_FC_VIEW: Record<AgendaViewMode, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
  professional: "timeGridWeek",
};

export function AgendaCalendar({
  calendarRef,
  viewMode,
  events,
  onDatesSet,
  onEventClick,
  onDateClick,
  onSelect,
}: {
  calendarRef: Ref<CalendarRef>;
  viewMode: AgendaViewMode;
  events: EventInput[];
  onDatesSet: (info: DatesSetInfo) => void;
  onEventClick: (info: EventClickInfo) => void;
  onDateClick: (info: DateClickInfo) => void;
  onSelect: (info: DateSelectInfo) => void;
}) {
  return (
    <div className="agenda-calendar overflow-hidden rounded-lg border">
      <Calendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, breezyTheme]}
        initialView={VIEW_MODE_TO_FC_VIEW[viewMode]}
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        locale={ptBrLocale}
        height="auto"
        slotMinTime="08:00:00"
        slotMaxTime="19:00:00"
        nowIndicator
        allDaySlot={false}
        selectable
        selectMirror
        dayMaxEvents
        events={events}
        datesSet={onDatesSet}
        eventClick={onEventClick}
        dateClick={onDateClick}
        select={onSelect}
      />
    </div>
  );
}
