"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { useDashboardCurrentUser } from "@/components/dashboard-current-user";
import { Brand } from "@/components/brand";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  FlagIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ShieldCheckIcon,
  FileTextIcon,
  CookieIcon,
} from "lucide-react";
import { marketingPath } from "@/lib/config";
import { getCurrentUser, switchActiveUniversity } from "@/lib/auth-api";
import { useRouter } from "next/navigation";

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
      title: "Bookings",
      url: "/dashboard/bookings",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Disputes",
      url: "/dashboard/disputes",
      icon: <FlagIcon />,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: <ChartBarIcon />,
    },
    {
      title: "Notifications",
      url: "/dashboard/notifications",
      icon: <BellIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Get Help",
      url: marketingPath("/help"),
      icon: <CircleHelpIcon />,
      external: true,
    },
    {
      title: "Privacy",
      url: marketingPath("/privacy"),
      icon: <ShieldCheckIcon />,
      external: true,
    },
    {
      title: "Terms",
      url: marketingPath("/terms"),
      icon: <FileTextIcon />,
      external: true,
    },
    {
      title: "Cookie notice",
      url: marketingPath("/cookies"),
      icon: <CookieIcon />,
      external: true,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, setAccount } = useDashboardCurrentUser();
  const router = useRouter();
  const [switching, setSwitching] = React.useState(false);
  const [switchError, setSwitchError] = React.useState<string | null>(null);
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
        {state.status === "loaded" && state.account.universities.length > 0 && (
          <SidebarGroup className="pb-0">
            <SidebarGroupLabel render={<label htmlFor="active-university" />}>
              University
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <Select
                items={Object.fromEntries(
                  state.account.universities.map((university) => [
                    university.rootOrganizationId,
                    university.name,
                  ]),
                )}
                value={state.account.organizationContext.rootOrganizationId ?? null}
                disabled={switching}
                onValueChange={async (rootOrganizationId) => {
                  if (typeof rootOrganizationId !== "string" || !rootOrganizationId) return;
                  setSwitching(true);
                  setSwitchError(null);
                  try {
                    await switchActiveUniversity(rootOrganizationId);
                    setAccount(await getCurrentUser());
                    router.refresh();
                  } catch {
                    setSwitchError("Unable to switch university. Try again.");
                  } finally {
                    setSwitching(false);
                  }
                }}
              >
                <SelectTrigger id="active-university" className="w-full">
                  <SelectValue placeholder="Choose a university" />
                </SelectTrigger>
                <SelectContent>
                  {state.account.universities.map((university) => (
                    <SelectItem
                      key={university.rootOrganizationId}
                      value={university.rootOrganizationId}
                    >
                      {university.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {switchError && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {switchError}
                </p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
