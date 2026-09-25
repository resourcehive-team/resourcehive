"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { useDashboardCurrentUser } from "@/components/dashboard-current-user";
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

const data = {
  user: {
    name: "Loading user",
    email: "",
    avatar: null,
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
      url: "/dashboard/notifications",
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
  const { state } = useDashboardCurrentUser();
  const user =
    state.status === "loaded"
      ? {
          name: state.account.user.displayName,
          email: state.account.user.email,
          avatar: state.account.user.avatarUrl,
        }
      : data.user;

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
