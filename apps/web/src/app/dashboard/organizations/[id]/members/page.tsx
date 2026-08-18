import Link from "next/link";

import { OrganizationMemberList } from "@/components/organization-member-list";
import { SiteHeader } from "@/components/site-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function OrganizationMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organizationHref = `/dashboard/organizations/${encodeURIComponent(id)}`;

  return (
    <>
      <SiteHeader title="Organization members" />
      <main className="app-page @container/main">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href="/dashboard/organizations" />}
              >
                Organizations
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={organizationHref} />}>
                Organization
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Members</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <OrganizationMemberList key={id} organizationId={id} />
      </main>
    </>
  );
}
