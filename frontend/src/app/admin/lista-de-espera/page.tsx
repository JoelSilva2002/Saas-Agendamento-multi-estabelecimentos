import { Clock } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function ListaDeEsperaPage() {
  return (
    <PagePlaceholder
      title="Lista de Espera"
      description="Clientes aguardando uma vaga, notificados automaticamente em cancelamentos"
      icon={Clock}
    />
  );
}
