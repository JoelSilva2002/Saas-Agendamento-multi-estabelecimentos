import { EstablishmentThemeProvider } from "@/components/providers/establishment-theme-provider";

export default async function EstablishmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ establishmentSlug: string }>;
}) {
  const { establishmentSlug } = await params;

  return (
    <EstablishmentThemeProvider establishmentKey={establishmentSlug}>
      {children}
    </EstablishmentThemeProvider>
  );
}
