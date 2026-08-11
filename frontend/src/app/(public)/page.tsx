import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Agendamentos online para o seu estabelecimento
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Gerencie horários, equipe, pagamentos e clientes em um só lugar. Seus clientes agendam
        pela página pública do seu estabelecimento, sem precisar ligar.
      </p>
      <div className="flex gap-3">
        <Button size="lg" asChild>
          <Link href="/register">Começar agora</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">Já tenho conta</Link>
        </Button>
      </div>
    </section>
  );
}
