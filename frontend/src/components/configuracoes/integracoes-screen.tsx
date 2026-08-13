"use client";

import { Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys/api";
import type { ApiKey, CreateApiKeyResult } from "@/lib/api-keys/types";
import { getSessionContext } from "@/lib/auth/session-context";

type CreateFormValues = { name: string };

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function IntegracoesScreen() {
  const [session] = useState(() => getSessionContext());
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<CreateApiKeyResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const form = useForm<CreateFormValues>({ defaultValues: { name: "" } });

  async function load() {
    if (!session) return;
    setIsLoading(true);
    try {
      const result = await listApiKeys(session.tenantId, session.establishmentId);
      setApiKeys(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar as chaves de API");
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

  async function handleCreate(values: CreateFormValues) {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const result = await createApiKey(session.tenantId, session.establishmentId, {
        name: values.name,
      });
      setCreated(result);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível gerar a chave");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyKey() {
    if (!created) return;
    void navigator.clipboard.writeText(created.rawKey);
    toast.success("Chave copiada");
  }

  function closeCreateDialog(open: boolean) {
    setCreateOpen(open);
    if (!open) {
      setCreated(null);
      form.reset({ name: "" });
    }
  }

  async function handleRevoke() {
    if (!session || !revokeTarget) return;
    setIsRevoking(true);
    try {
      await revokeApiKey(session.tenantId, session.establishmentId, revokeTarget.id);
      toast.success("Chave revogada");
      setRevokeTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível revogar a chave");
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Chaves de API para automações próprias (ex.: um bot de WhatsApp) consultarem e
            criarem agendamentos em nome do estabelecimento.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <KeyRound className="size-4" />
          Gerar nova chave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chaves de API</CardTitle>
          <CardDescription>
            Cada chave permite consultar disponibilidade e agendamentos, criar agendamentos e
            cancelar/remarcar em nome deste estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <KeyRound className="size-8 opacity-50" />
                        Nenhuma chave de API gerada ainda.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {apiKey.keyPrefix}…
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(apiKey.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(apiKey.lastUsedAt)}
                      </TableCell>
                      <TableCell>
                        {apiKey.revokedAt ? (
                          <Badge variant="destructive">Revogada</Badge>
                        ) : (
                          <Badge variant="secondary">Ativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!apiKey.revokedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRevokeTarget(apiKey)}
                          >
                            Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={closeCreateDialog}>
        <DialogContent>
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>Chave gerada</DialogTitle>
                <DialogDescription>
                  Guarde a chave abaixo — ela só é exibida uma vez e não pode ser recuperada
                  depois.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome: </span>
                  {created.name}
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  <span className="flex-1 break-all">{created.rawKey}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={handleCopyKey}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => closeCreateDialog(false)}>
                  Concluir
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Gerar nova chave</DialogTitle>
                <DialogDescription>
                  Dê um nome que identifique onde essa chave será usada (ex.: &quot;Bot
                  WhatsApp&quot;).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleCreate)} className="flex flex-col gap-4">
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="api-key-name">Nome</FieldLabel>
                  <Input
                    id="api-key-name"
                    autoFocus
                    {...form.register("name", { required: "Informe um nome" })}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.name
                        ? [{ message: form.formState.errors.name.message }]
                        : undefined
                    }
                  />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => closeCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Gerando..." : "Gerar chave"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar chave</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Qualquer automação usando &quot;{revokeTarget?.name}&quot;
              perderá acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isRevoking} onClick={handleRevoke}>
              {isRevoking ? "Revogando..." : "Revogar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
