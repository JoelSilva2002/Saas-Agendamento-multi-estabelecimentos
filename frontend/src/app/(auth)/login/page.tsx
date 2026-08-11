import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse o painel do seu estabelecimento.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="voce@estabelecimento.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/register" className="text-primary underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
