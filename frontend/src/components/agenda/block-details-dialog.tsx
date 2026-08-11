"use client";

import { useState } from "react";
import { CalendarDays, Clock, User } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/catalog";
import type { AgendaBlock } from "@/lib/agenda/types";

export function BlockDetailsDialog({
  block,
  open,
  onOpenChange,
  onDelete,
}: {
  block: AgendaBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  if (!block) return null;

  const employee = block.employeeId ? MOCK_EMPLOYEES.find((e) => e.id === block.employeeId) : null;

  async function handleDelete() {
    if (!block) return;
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete(block.id);
      onOpenChange(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Não foi possível remover o bloqueio");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Horário bloqueado</DialogTitle>
          {block.reason && <DialogDescription>{block.reason}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center gap-2">
            <User className="size-4 shrink-0 text-muted-foreground" />
            {employee ? employee.displayName : "Toda a equipe"}
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            {formatFullDate(block.startAt.slice(0, 10))}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {formatTime(block.startAt)} – {formatTime(block.endAt)}
          </div>
        </div>

        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            Remover bloqueio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
