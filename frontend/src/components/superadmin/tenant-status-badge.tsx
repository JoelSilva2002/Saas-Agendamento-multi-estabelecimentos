import { Badge } from "@/components/ui/badge";
import type { TenantStatus } from "@/lib/tenants/types";

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<TenantStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  suspended: "secondary",
  cancelled: "destructive",
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
