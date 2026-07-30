import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function OrganizationDetailsPage() {
  return (
    <>
      <SiteHeader title="Organization details" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={
                      <Link href="/dashboard/organizations" />
                    }
                  >
                    Organizations
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Details</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Organization details
              </h2>
              <p className="text-muted-foreground">
                View this organization and the organizations directly beneath
                it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
