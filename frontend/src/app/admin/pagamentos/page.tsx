import { CreditCard } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function PagamentosPage() {
  return (
    <PagePlaceholder
      title="Pagamentos"
      description="Cobranças, status de pagamento e aplicação de cupons"
      icon={CreditCard}
    />
  );
}
