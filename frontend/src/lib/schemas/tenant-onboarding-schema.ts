import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const SLUG_MESSAGE = "Use apenas letras minúsculas, números e hífen";

export const tenantOnboardingSchema = z.object({
  name: z.string().min(1, "Informe o nome do empreendimento"),
  slug: z.string().min(1, "Informe o slug").regex(SLUG_PATTERN, SLUG_MESSAGE),
  document: z.string().optional(),
  ownerFirstName: z.string().min(1, "Informe o nome do responsável"),
  ownerLastName: z.string().min(1, "Informe o sobrenome do responsável"),
  ownerEmail: z.email("Informe um e-mail válido"),
  establishmentName: z.string().min(1, "Informe o nome do estabelecimento"),
  establishmentSlug: z.string().min(1, "Informe o slug do estabelecimento").regex(SLUG_PATTERN, SLUG_MESSAGE),
});

export type TenantOnboardingFormValues = z.infer<typeof tenantOnboardingSchema>;
