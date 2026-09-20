import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { OrganizationDisputes } from "@/components/organization-disputes";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function OrganizationDisputesPage() {
  return (
    <>
      <SiteHeader title="Organization disputes" />
      <main className="app-page @container/main">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard/disputes" />}>
                Disputes
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRightIcon />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Organization disputes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ScreenHeading
          eyebrow="Administrator review"
          title="Organization disputes"
          description="Review disputes opened against resources you administer, resolve or reject them, and update the linked resource's availability."
        />
        <OrganizationDisputes />
      </main>
    </>
  );
}
