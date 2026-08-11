"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import { listEmployees } from "@/lib/employees/api";
import type { Employee } from "@/lib/employees/types";
import { deleteReview, getReviewSummary, listReviews } from "@/lib/reviews/api";
import type { Review, ReviewSummary } from "@/lib/reviews/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

const ALL_EMPLOYEES_VALUE = "all";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating ? "size-4 fill-yellow-400 text-yellow-400" : "size-4 text-muted-foreground"
          }
        />
      ))}
    </div>
  );
}

export function AvaliacoesScreen() {
  const [session] = useState(() => getSessionContext());
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState(ALL_EMPLOYEES_VALUE);
  const [isLoading, setIsLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function load(employeeId: string) {
    if (!session) return;
    setIsLoading(true);
    try {
      const filterId = employeeId === ALL_EMPLOYEES_VALUE ? undefined : employeeId;
      const [reviewsResult, summaryResult, employeesResult, usersResult] = await Promise.all([
        listReviews(session.tenantId, session.establishmentId, filterId),
        getReviewSummary(session.tenantId, session.establishmentId, filterId),
        listEmployees(session.tenantId, session.establishmentId),
        listTenantUsers(session.tenantId),
      ]);
      setReviews(reviewsResult);
      setSummary(summaryResult);
      setEmployees(employeesResult);
      setUsers(usersResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar as avaliações");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(employeeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, employeeFilter]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const employeeNames = new Map(employees.map((e) => [e.id, userNames.get(e.userId) ?? e.jobTitle]));

  async function handleDelete() {
    if (!session || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteReview(session.tenantId, session.establishmentId, deleteTarget.id);
      toast.success("Avaliação removida");
      setDeleteTarget(null);
      await load(employeeFilter);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a avaliação");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
          <p className="text-sm text-muted-foreground">
            Notas e comentários de clientes sobre atendimentos concluídos.
          </p>
        </div>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EMPLOYEES_VALUE}>Todos os profissionais</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employeeNames.get(employee.id) ?? employee.jobTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Média de avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold tracking-tight">
                {(summary?.average ?? 0).toFixed(1)}
              </span>
              <StarRating rating={Math.round(summary?.average ?? 0)} />
              <span className="text-sm text-muted-foreground">
                ({summary?.count ?? 0} avaliaç{summary?.count === 1 ? "ão" : "ões"})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Star className="size-8 opacity-50" />
                    Nenhuma avaliação registrada.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">
                    {review.employeeId ? employeeNames.get(review.employeeId) ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    <StarRating rating={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-md text-muted-foreground">
                    {review.comment ?? <span className="italic">Sem comentário</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(review)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover avaliação</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. A avaliação deixará de aparecer para clientes e na média do
              estabelecimento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
