"use client";

import { Ticket, TicketX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import { createCoupon, deactivateCoupon, listCoupons, updateCoupon } from "@/lib/coupons/api";
import type { Coupon, CreateCouponInput, UpdateCouponInput } from "@/lib/coupons/types";

import { CouponFormDialog } from "./coupon-form-dialog";

const STATUS_LABEL: Record<Coupon["status"], string> = {
  active: "Ativo",
  inactive: "Inativo",
  expired: "Expirado",
};

function formatDiscount(coupon: Coupon): string {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}%`
    : coupon.discountValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function CuponsScreen() {
  const [session] = useState(() => getSessionContext());
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Coupon | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const result = await listCoupons(session.tenantId, session.establishmentId);
      setCoupons(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os cupons");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  async function handleSubmit(values: CreateCouponInput | UpdateCouponInput) {
    if (!session) throw new Error("Sessão não encontrada");
    if (editingCoupon) {
      await updateCoupon(session.tenantId, editingCoupon.id, values as UpdateCouponInput);
    } else {
      await createCoupon(session.tenantId, {
        ...(values as CreateCouponInput),
        establishmentId: session.establishmentId,
      });
    }
    await load();
  }

  async function handleDeactivate() {
    if (!session || !deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivateCoupon(session.tenantId, deactivateTarget.id);
      toast.success("Cupom desativado");
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível desativar o cupom");
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cupons</h1>
          <p className="text-sm text-muted-foreground">Cupons de desconto por percentual ou valor fixo.</p>
        </div>
        <Button
          onClick={() => {
            setEditingCoupon(null);
            setFormOpen(true);
          }}
        >
          <Ticket />
          Novo cupom
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <TicketX className="size-8 opacity-50" />
                    Nenhum cupom cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDiscount(coupon)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.usedCount}
                    {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(coupon.validFrom)} – {formatDate(coupon.validUntil)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.status === "active" ? "default" : "secondary"}>
                      {STATUS_LABEL[coupon.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      {coupon.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeactivateTarget(coupon)}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        coupon={editingCoupon}
        onSubmit={handleSubmit}
      />

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar cupom</DialogTitle>
            <DialogDescription>
              {deactivateTarget ? `O cupom "${deactivateTarget.code}" deixará de ser aceito.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
