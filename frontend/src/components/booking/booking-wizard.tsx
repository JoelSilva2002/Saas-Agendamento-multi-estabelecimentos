"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { BookingSuccess } from "@/components/booking/booking-success";
import { ConfirmationStep } from "@/components/booking/steps/confirmation-step";
import { DateStep } from "@/components/booking/steps/date-step";
import { IdentificationStep } from "@/components/booking/steps/identification-step";
import { ProfessionalStep } from "@/components/booking/steps/professional-step";
import { ServiceStep } from "@/components/booking/steps/service-step";
import { TimeSlotsStep } from "@/components/booking/steps/time-slots-step";
import { WizardNav } from "@/components/booking/wizard-nav";
import { WizardProgress } from "@/components/booking/wizard-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { ApiError } from "@/lib/api/client";
import { createAppointment } from "@/lib/appointments/api";
import type { Appointment } from "@/lib/appointments/types";
import { login, register } from "@/lib/auth/api";
import { getAccessToken, setTokens } from "@/lib/auth/token-storage";
import {
  getEstablishment,
  listAvailableSlots,
  listEligibleEmployees,
  listServices,
} from "@/lib/public/api";
import type { PublicSlot } from "@/lib/public/types";
import {
  AUTH_STEP,
  BOOKING_STEP_COUNT,
  bookingFormSchema,
  defaultBookingFormValues,
  STEP_FIELDS,
  type BookingFormValues,
} from "@/lib/schemas/booking-schema";

export function BookingWizard({ establishmentSlug }: { establishmentSlug: string }) {
  const [step, setStep] = useState(1);
  // Someone who already signed in (from the header, or a previous booking) should not be
  // asked to authenticate again — read once on mount so the value stays stable per session.
  const [wasAlreadySignedIn] = useState(() => Boolean(getAccessToken()));

  const [authError, setAuthError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [bookingResult, setBookingResult] = useState<Appointment | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultBookingFormValues,
    mode: "onBlur",
  });

  const serviceId = form.watch("serviceId");
  const employeeId = form.watch("employeeId");
  const date = form.watch("date");

  const establishmentQuery = useAsync(
    () => getEstablishment(establishmentSlug),
    [establishmentSlug],
  );
  const establishment =
    establishmentQuery.status === "success" ? establishmentQuery.data : undefined;

  const servicesQuery = useAsync(() => listServices(establishmentSlug), [establishmentSlug]);
  const services = servicesQuery.status === "success" ? servicesQuery.data : [];
  const selectedService = services.find((s) => s.id === serviceId);

  const employeesQuery = useAsync(
    () => listEligibleEmployees(establishmentSlug, serviceId),
    [establishmentSlug, serviceId],
    Boolean(serviceId),
  );
  const employees = employeesQuery.status === "success" ? employeesQuery.data : [];
  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const slotsQuery = useAsync(
    () => listAvailableSlots(establishmentSlug, { serviceId, employeeId, date }),
    [establishmentSlug, serviceId, employeeId, date],
    Boolean(serviceId && employeeId && date),
  );
  const slots = slotsQuery.status === "success" ? slotsQuery.data : [];

  function handleSelectService(id: string) {
    form.setValue("serviceId", id, { shouldValidate: true });
    form.setValue("employeeId", "");
    form.setValue("date", "");
    form.setValue("slotStartAt", "");
    form.setValue("slotEndAt", "");
  }

  function handleSelectEmployee(id: string) {
    form.setValue("employeeId", id, { shouldValidate: true });
    form.setValue("date", "");
    form.setValue("slotStartAt", "");
    form.setValue("slotEndAt", "");
  }

  function handleSelectDate(dateKey: string) {
    form.setValue("date", dateKey, { shouldValidate: true });
    form.setValue("slotStartAt", "");
    form.setValue("slotEndAt", "");
  }

  function handleSelectSlot(slot: PublicSlot) {
    form.setValue("slotStartAt", slot.startAt, { shouldValidate: true });
    form.setValue("slotEndAt", slot.endAt, { shouldValidate: true });
  }

  /** Signs the visitor in (or creates their account) so the booking can be attributed to them.
   * The appointment endpoint derives clientId from the token, never from the request body. */
  async function authenticate(values: BookingFormValues): Promise<void> {
    if (!establishment) throw new Error("Estabelecimento não carregado");

    if (values.authMode === "register") {
      await register({
        tenantId: establishment.tenantId,
        establishmentId: establishment.establishmentId,
        email: values.email,
        password: values.password,
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        phone: values.phone,
      });
    }

    // Register does not return tokens, so both paths finish with a login.
    const result = await login(values.email, values.password);
    setTokens(result);
  }

  async function submitBooking() {
    if (!establishment) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const values = form.getValues();
      const appointment = await createAppointment(
        establishment.tenantId,
        establishment.establishmentId,
        {
          // clientId is deliberately omitted: for a client-role caller the backend always
          // attributes the booking to the authenticated user.
          employeeId: values.employeeId,
          serviceId: values.serviceId,
          startAt: values.slotStartAt,
        },
      );
      setBookingResult(appointment);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Não foi possível concluir o agendamento",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function goNext() {
    // Skip identification entirely for an already-authenticated client: its fields are empty
    // and would fail validation for a step we do not need to run.
    if (step === AUTH_STEP - 1 && wasAlreadySignedIn) {
      const valid = await form.trigger(STEP_FIELDS[step], { shouldFocus: true });
      if (valid) setStep(AUTH_STEP + 1);
      return;
    }

    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    if (step === AUTH_STEP) {
      setIsSubmitting(true);
      setAuthError(undefined);
      try {
        await authenticate(form.getValues());
        setStep(AUTH_STEP + 1);
      } catch (err) {
        setAuthError(
          err instanceof ApiError ? err.message : "Não foi possível continuar",
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === BOOKING_STEP_COUNT) {
      await submitBooking();
      return;
    }

    setStep((s) => Math.min(BOOKING_STEP_COUNT, s + 1));
  }

  function goBack() {
    setStep((s) => {
      const previous = s === AUTH_STEP + 1 && wasAlreadySignedIn ? AUTH_STEP - 1 : s - 1;
      return Math.max(1, previous);
    });
  }

  if (establishmentQuery.status === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Alert variant="destructive">
          <AlertDescription>Estabelecimento não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (establishmentQuery.status !== "success") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Past the guard above, the query is narrowed to "success" — unlike `establishment`, which
  // was derived before it and stays optional to TypeScript.
  const timeZone = establishmentQuery.data.timezone;

  if (bookingResult) {
    return (
      <BookingSuccess
        establishmentSlug={establishmentSlug}
        appointment={bookingResult}
        service={selectedService}
        timeZone={timeZone}
      />
    );
  }

  const nextDisabled =
    (step === 1 && !serviceId) ||
    (step === 2 && !employeeId) ||
    (step === 3 && !date) ||
    (step === 4 && !form.watch("slotStartAt"));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:py-10">
      <WizardProgress step={step} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void goNext();
        }}
        className="flex flex-1 flex-col"
      >
        <div className="flex-1">
          {step === 1 && (
            <ServiceStep
              form={form}
              services={services}
              status={servicesQuery.status}
              error={servicesQuery.status === "error" ? servicesQuery.error : undefined}
              onSelect={handleSelectService}
            />
          )}
          {step === 2 && (
            <ProfessionalStep
              form={form}
              employees={employees}
              status={employeesQuery.status}
              error={employeesQuery.status === "error" ? employeesQuery.error : undefined}
              onSelect={handleSelectEmployee}
            />
          )}
          {step === 3 && <DateStep form={form} onSelect={handleSelectDate} />}
          {step === 4 && (
            <TimeSlotsStep
              form={form}
              slots={slots}
              status={slotsQuery.status}
              error={slotsQuery.status === "error" ? slotsQuery.error : undefined}
              onSelect={handleSelectSlot}
              timeZone={timeZone}
            />
          )}
          {step === 5 && <IdentificationStep form={form} authError={authError} />}
          {step === 6 && (
            <ConfirmationStep
              form={form}
              service={selectedService}
              employee={selectedEmployee}
              submitError={submitError}
              timeZone={timeZone}
            />
          )}
        </div>

        <WizardNav
          step={step}
          totalSteps={BOOKING_STEP_COUNT}
          onBack={goBack}
          onNext={() => void goNext()}
          nextDisabled={nextDisabled}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
