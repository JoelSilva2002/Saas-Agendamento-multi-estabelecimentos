import { BarChart3 } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function RelatoriosPage() {
  return (
    <PagePlaceholder
      title="Relatórios"
      description="Faturamento mensal, serviços mais vendidos, produtividade e horários de pico"
      icon={BarChart3}
    />
  );
}
