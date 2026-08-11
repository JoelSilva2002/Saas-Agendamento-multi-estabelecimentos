import Link from "next/link";
import { CalendarClock } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <CalendarClock className="size-5 text-primary" />
        AgendaSaaS
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
