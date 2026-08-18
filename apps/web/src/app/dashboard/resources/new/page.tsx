import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { ResourceCreationForm } from "@/components/resource-creation-form";
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

export default function NewResourcePage() {
  return (
    <>
      <SiteHeader title="Create resource" />
      <main className="app-page @container/main">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard/resources" />}>
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
        <ScreenHeading
          eyebrow="Catalogue administration"
          title="Create resource"
          description="Add a resource and define which organizations can discover and use it."
        />
        <div className="md:col-span-8">
          <ResourceCreationForm />
        </div>
      </main>
    </>
  );
}
