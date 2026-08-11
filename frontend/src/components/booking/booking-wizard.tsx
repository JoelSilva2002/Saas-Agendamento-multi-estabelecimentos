"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { BookingSuccess } from "@/components/booking/booking-success";
import { ConfirmationStep } from "@/components/booking/steps/confirmation-step";
import { CouponStep } from "@/components/booking/steps/coupon-step";
import { DateStep } from "@/components/booking/steps/date-step";
import { IdentificationStep } from "@/components/booking/steps/identification-step";
import { PaymentStep } from "@/components/booking/steps/payment-step";
import { ProfessionalStep } from "@/components/booking/steps/professional-step";
import { ServiceStep } from "@/components/booking/steps/service-step";
import { TimeSlotsStep } from "@/components/booking/steps/time-slots-step";
import { WizardNav } from "@/components/booking/wizard-nav";
import { WizardProgress } from "@/components/booking/wizard-progress";
import { createMockBookingApi } from "@/lib/booking/mock-api";
import { useAsync } from "@/hooks/use-async";
import type { CouponPreview, CreatedAppointment, CreatedPayment, TimeSlot } from "@/lib/booking/types";
import {
  BOOKING_STEP_COUNT,
  bookingFormSchema,
  defaultBookingFormValues,
  STEP_FIELDS,
  type BookingFormValues,
} from "@/lib/schemas/booking-schema";

export function BookingWizard({ establishmentSlug }: { establishmentSlug: string }) {
  const [api] = useState(() => createMockBookingApi());
  const [step, setStep] = useState(1);

  const [authError, setAuthError] = useState<string | undefined>();
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [bookingResult, setBookingResult] = useState<{
    appointment: CreatedAppointment;
    payment: CreatedPayment;
  } | null>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultBookingFormValues,
    mode: "onBlur",
  });

  const serviceId = form.watch("serviceId");
  const employeeId = form.watch("employeeId");
  const date = form.watch("date");

  const servicesQuery = useAsync(() => api.listServices(), [api]);
  const services = servicesQuery.status === "success" ? servicesQuery.data : [];
  const selectedService = services.find((s) => s.id === serviceId);

  const employeesQuery = useAsync(
    () => api.listEligibleEmployees(serviceId),
    [api, serviceId],
    Boolean(serviceId),
  );
  const employees = employeesQuery.status === "success" ? employeesQuery.data : [];
  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const slotsQuery = useAsync(
    () => api.listAvailableSlots({ serviceId, employeeId, date }),
    [api, serviceId, employeeId, date],
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

  function handleSelectSlot(slot: TimeSlot) {
    form.setValue("slotStartAt", slot.startAt, { shouldValidate: true });
    form.setValue("slotEndAt", slot.endAt, { shouldValidate: true });
  }

  async function applyCoupon(code: string) {
    setIsCheckingCoupon(true);
    setCouponError(null);
    try {
      const priceCents = selectedService ? Math.round(selectedService.price * 100) : 0;
      const result = await api.previewCoupon({ code, amountCents: priceCents });
      setCoupon(result);
      form.setValue("couponCode", result.code);
      return true;
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof Error ? err.message : "Cupom inválido");
      return false;
    } finally {
      setIsCheckingCoupon(false);
    }
  }

  function clearCoupon() {
    setCoupon(null);
    setCouponError(null);
    form.setValue("couponCode", "");
  }

  async function submitBooking() {
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      const values = form.getValues();
      const appointment = await api.createAppointment({
        serviceId: values.serviceId,
        employeeId: values.employeeId,
        startAt: values.slotStartAt,
      });
      const payment = await api.createPayment({
        appointmentId: appointment.id,
        method: values.paymentMethod,
        paymentType: values.paymentType,
        couponCode: coupon?.code,
      });
      setBookingResult({ appointment, payment });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Não foi possível concluir o agendamento",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    if (step === 5) {
      setIsSubmitting(true);
      setAuthError(undefined);
      try {
        const values = form.getValues();
        if (values.authMode === "login") {
          await api.login({ email: values.email, password: values.password });
        } else {
          await api.register({
            email: values.email,
            password: values.password,
            firstName: values.firstName ?? "",
            lastName: values.lastName ?? "",
            phone: values.phone ?? "",
          });
        }
        setStep(6);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Não foi possível continuar");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === 6) {
      const code = form.getValues("couponCode")?.trim();
      if (!code) {
        setCoupon(null);
        setCouponError(null);
        setStep(7);
        return;
      }
      if (coupon?.code === code.toUpperCase()) {
        setStep(7);
        return;
      }
      const ok = await applyCoupon(code);
      if (ok) setStep(7);
      return;
    }

    if (step === BOOKING_STEP_COUNT) {
      await submitBooking();
      return;
    }

    setStep((s) => Math.min(BOOKING_STEP_COUNT, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  if (bookingResult) {
    return (
      <BookingSuccess
        establishmentSlug={establishmentSlug}
        appointment={bookingResult.appointment}
        payment={bookingResult.payment}
        service={selectedService}
      />
    );
  }

  const nextDisabled =
    (step === 1 && !serviceId) ||
    (step === 2 && !employeeId) ||
    (step === 3 && !date) ||
    (step === 4 && !form.watch("slotStartAt"));

  const navSubmitting = isSubmitting || (step === 6 && isCheckingCoupon);

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
            />
          )}
          {step === 5 && <IdentificationStep form={form} authError={authError} />}
          {step === 6 && (
            <CouponStep
              form={form}
              coupon={coupon}
              couponError={couponError}
              isChecking={isCheckingCoupon}
              onApply={applyCoupon}
              onClear={clearCoupon}
            />
          )}
          {step === 7 && <PaymentStep form={form} service={selectedService} coupon={coupon} />}
          {step === 8 && (
            <ConfirmationStep
              form={form}
              service={selectedService}
              employee={selectedEmployee}
              coupon={coupon}
              submitError={submitError}
            />
          )}
        </div>

        <WizardNav
          step={step}
          totalSteps={BOOKING_STEP_COUNT}
          onBack={goBack}
          onNext={() => void goNext()}
          nextDisabled={nextDisabled}
          isSubmitting={navSubmitting}
        />
      </form>
    </div>
  );
}
