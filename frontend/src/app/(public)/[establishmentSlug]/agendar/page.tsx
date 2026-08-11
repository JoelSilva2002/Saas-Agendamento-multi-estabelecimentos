import { BookingWizard } from "@/components/booking/booking-wizard";

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string }>;
}) {
  const { establishmentSlug } = await params;

  return <BookingWizard establishmentSlug={establishmentSlug} />;
}
