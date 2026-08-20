"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Brand } from "@/components/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BellIcon,
  BookOpenIcon,
  Building2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CircleHelpIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";
import {
  AuthenticationRequiredError,
  getCurrentUser,
  logout,
} from "@/lib/auth-api";

const data = {
  user: {
    name: "Loading user",
    email: "",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Resources",
      url: "/dashboard/resources",
      icon: <BookOpenIcon />,
    },
    {
      title: "Organizations",
      url: "/dashboard/organizations",
      icon: <Building2Icon />,
    },
    {
      title: "My memberships",
      url: "/dashboard/memberships",
      icon: <UsersIcon />,
    },
    {
      title: "My bookings",
      url: "/dashboard/bookings",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Notifications",
      url: "#",
      icon: <BellIcon />,
    },
    {
      title: "Points",
      url: "#",
      icon: <ChartBarIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [user, setUser] = React.useState(data.user);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then((currentUser) => {
        setUser({
          name: currentUser.user.displayName,
          email: currentUser.user.email,
          avatar: "",
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof AuthenticationRequiredError) {
          void logout()
            .catch(() => undefined)
            .finally(() => {
              router.replace("/login");
              router.refresh();
            });
        }
      });

    return () => controller.abort();
  }, [router]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="h-(--header-height) shrink-0 justify-center border-b border-sidebar-border px-4 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <Brand />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
