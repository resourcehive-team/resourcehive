"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BellIcon,
  BookOpenIcon,
  Building2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CircleHelpIcon,
  CommandIcon,
  LayoutDashboardIcon,
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
      url: "#",
      icon: <BookOpenIcon />,
    },
    {
      title: "Organizations",
      url: "#",
      icon: <Building2Icon />,
    },
    {
      title: "My bookings",
      url: "#",
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">ResourceHive</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
