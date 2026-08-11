import { cookies } from "next/headers";

import { SuperadminSidebar } from "@/components/layout/superadmin-sidebar";
import { SuperadminTopbar } from "@/components/layout/superadmin-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function SuperadminLayout({ children }: LayoutProps<"/superadmin">) {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <SuperadminSidebar />
      <SidebarInset>
        <SuperadminTopbar />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
