import { Star } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function AvaliacoesPage() {
  return (
    <PagePlaceholder
      title="Avaliações"
      description="Notas e comentários de clientes sobre atendimentos concluídos"
      icon={Star}
    />
  );
}
