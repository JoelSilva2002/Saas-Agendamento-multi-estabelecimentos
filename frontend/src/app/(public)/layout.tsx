import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PublicAuthNav } from "@/components/public/public-auth-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-5 text-primary" />
            AgendaSaaS
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/buscar">Explorar</Link>
            </Button>
            <ThemeToggle />
            <PublicAuthNav />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} AgendaSaaS. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
