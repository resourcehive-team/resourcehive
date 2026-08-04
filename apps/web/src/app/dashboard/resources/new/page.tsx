import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { ResourceCreationForm } from "@/components/resource-creation-form";
import { SiteHeader } from "@/components/site-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function NewResourcePage() {
  return (
    <>
      <SiteHeader title="Create resource" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href="/dashboard/resources" />}
                  >
                    Resources
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRightIcon />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Create resource</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Create resource
              </h2>
              <p className="text-muted-foreground">
                Add a resource for an organization you administer.
              </p>
            </div>

            <ResourceCreationForm />
          </div>
        </div>
      </div>
    </>
  );
}
