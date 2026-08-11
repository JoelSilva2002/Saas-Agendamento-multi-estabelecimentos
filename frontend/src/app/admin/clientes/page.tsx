import { Users } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function ClientesPage() {
  return (
    <PagePlaceholder
      title="Clientes"
      description="Cadastro e histórico de clientes do estabelecimento"
      icon={Users}
    />
  );
}
