"use client";

import { CalendarCheck, CalendarX, Clock, Star, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/agenda/status";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token-storage";
import { formatFullDateFromInstant, formatTime } from "@/lib/booking/date-utils";
import { deriveHabits } from "@/lib/my-appointments/habits";
import { listMyAppointments } from "@/lib/my-appointments/api";
import type { MyAppointment } from "@/lib/my-appointments/types";

function AppointmentRow({ appointment }: { appointment: MyAppointment }) {
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{appointment.serviceName}</p>
        <p className="text-sm text-muted-foreground">
          {appointment.establishmentSlug ? (
            <Link href={`/${appointment.establishmentSlug}`} className="hover:text-primary">
              {appointment.establishmentName}
            </Link>
          ) : (
            appointment.establishmentName
          )}{" "}
          · {appointment.employeeName}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {formatFullDateFromInstant(appointment.startAt, appointment.timeZone)} ·{" "}
          {formatTime(appointment.startAt, appointment.timeZone)}
        </span>
        <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
          {STATUS_LABELS[appointment.status]}
        </Badge>
      </div>
    </li>
  );
}

export function MyAppointmentsScreen() {
  const [isSignedIn] = useState(() => Boolean(getAccessToken()));
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    listMyAppointments()
      .then(setAppointments)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar seus agendamentos",
        );
      })
      .finally(() => setIsLoading(false));
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Meus agendamentos</h1>
        <p className="text-muted-foreground">
          Entre na sua conta para ver seu histórico, seus profissionais preferidos e seu horário
          habitual.
        </p>
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </section>
    );
  }

  const now = Date.now();
  const upcoming = appointments
    .filter((a) => new Date(a.startAt).getTime() >= now && a.status !== "cancelled")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const past = appointments.filter(
    (a) => new Date(a.startAt).getTime() < now || a.status === "cancelled",
  );
  const habits = deriveHabits(appointments);
  const hasHabits = habits.favouriteEmployee || habits.usualHour || habits.favouriteService;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus agendamentos</h1>
        <p className="text-sm text-muted-foreground">
          Seu histórico em todos os estabelecimentos.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {hasHabits && (
            <Card>
              <CardHeader>
                <CardTitle>Suas preferências</CardTitle>
                <CardDescription>Detectadas a partir dos seus atendimentos.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6 text-sm">
                {habits.favouriteEmployee && (
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Profissional preferido:</span>
                    <span className="font-medium">{habits.favouriteEmployee.name}</span>
                  </div>
                )}
                {habits.usualHour && (
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Horário habitual:</span>
                    <span className="font-medium">
                      {String(habits.usualHour.hour).padStart(2, "0")}:00
                    </span>
                  </div>
                )}
                {habits.favouriteService && (
                  <div className="flex items-center gap-2">
                    <Star className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Serviço mais frequente:</span>
                    <span className="font-medium">{habits.favouriteService.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Próximos</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <CalendarX className="size-8 opacity-50" />
                  <p>Você não tem agendamentos futuros.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/buscar">Agendar agora</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {past.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <CalendarCheck className="size-8 opacity-50" />
                  <p>Nenhum atendimento anterior ainda.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {past.map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
