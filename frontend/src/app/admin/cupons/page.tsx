import { Ticket } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function CuponsPage() {
  return (
    <PagePlaceholder
      title="Cupons"
      description="Cupons de desconto por percentual ou valor fixo"
      icon={Ticket}
    />
  );
}
