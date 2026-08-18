import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { ResourceDetails } from "@/components/resource-details";
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

export default async function ResourceDetailsPage({
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
      <SiteHeader title="Resource details" />
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
              <BreadcrumbPage>Details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {organizationId ? (
          <ResourceDetails
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
