import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { ResourceEditForm } from "@/components/resource-edit-form";
import { SiteHeader } from "@/components/site-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>;
  searchParams: Promise<{ organization?: string | string[] }>;
}) {
  const { resourceId } = await params;
  const { organization } = await searchParams;
  const organizationId = Array.isArray(organization)
    ? organization[0]
    : organization;

  return (
    <>
      <SiteHeader title="Edit resource" />
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
              <BreadcrumbLink
                render={
                  <Link
                    href={`/dashboard/resources/${resourceId}${
                      organizationId ? `?organization=${organizationId}` : ""
                    }`}
                  />
                }
              >
                Details
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRightIcon />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {organizationId ? (
          <ResourceEditForm
            organizationId={organizationId}
            resourceId={resourceId}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Resource link incomplete</CardTitle>
              <CardDescription>
                Open this resource from the catalogue so ResourceHive can use
                the correct organization access.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </>
  );
}
