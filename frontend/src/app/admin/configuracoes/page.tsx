import { Settings } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      title="Estabelecimento"
      description="Dados cadastrais, endereço, horários e política de cancelamento"
      icon={Settings}
    />
  );
}
