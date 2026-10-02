import { AppSidebar } from "@/components/app-sidebar";
import { DashboardCurrentUserProvider } from "@/components/dashboard-current-user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WebPushListener } from "@/components/web-push-listener";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardCurrentUserProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 68)",
            "--header-height": "calc(var(--spacing) * 14)",
          } as React.CSSProperties
        }
      >
        <WebPushListener />
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </DashboardCurrentUserProvider>
  );
}
