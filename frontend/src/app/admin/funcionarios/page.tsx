import { UserCog } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function FuncionariosPage() {
  return (
    <PagePlaceholder
      title="Funcionários"
      description="Equipe, horários de trabalho e produtividade"
      icon={UserCog}
    />
  );
}
