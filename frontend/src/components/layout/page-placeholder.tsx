import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge variant="secondary">Em construção</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal">
            <Icon className="size-4" />
            {description}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta tela será implementada em uma próxima etapa do frontend.
        </CardContent>
      </Card>
    </div>
  );
}
