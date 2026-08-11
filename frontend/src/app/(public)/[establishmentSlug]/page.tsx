import { EstablishmentDetail } from "@/components/public/establishment-detail";

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string }>;
}) {
  const { establishmentSlug } = await params;

  return <EstablishmentDetail slug={establishmentSlug} />;
}
