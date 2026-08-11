import { cookies } from "next/headers";

import { AdminTopbar } from "@/components/layout/admin-topbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { EstablishmentThemeProvider } from "@/components/providers/establishment-theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Auth/tenant resolution isn't wired up yet, so the signed-in staff
  // member's establishment is a fixed placeholder key for now — see
  // EstablishmentThemeProvider for why this is safe to swap later.
  return (
    <EstablishmentThemeProvider establishmentKey="current">
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <AdminTopbar />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </EstablishmentThemeProvider>
  );
}
