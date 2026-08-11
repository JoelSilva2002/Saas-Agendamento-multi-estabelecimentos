import type { UseFormReturn } from "react-hook-form";

import type { BookingFormValues } from "@/lib/schemas/booking-schema";

export type BookingStepProps = {
  form: UseFormReturn<BookingFormValues>;
};
