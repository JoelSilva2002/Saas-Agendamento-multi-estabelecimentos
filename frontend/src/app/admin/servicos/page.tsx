import { Scissors } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function ServicosPage() {
  return (
    <PagePlaceholder
      title="Serviços"
      description="Catálogo de serviços, categorias e vínculo com funcionários"
      icon={Scissors}
    />
  );
}
