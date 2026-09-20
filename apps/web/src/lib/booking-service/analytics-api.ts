import "client-only";

import { apiRequest } from "@/lib/api-client";
import type {
  OrganizationAnalytics,
  PersonalAnalytics,
} from "@/lib/booking-service/types";

export interface AnalyticsRangeOptions {
  from?: Date;
  to?: Date;
  signal?: AbortSignal;
}

export function getOrganizationAnalytics(
  options: AnalyticsRangeOptions = {},
): Promise<OrganizationAnalytics> {
  const { signal, ...range } = options;

  return apiRequest<OrganizationAnalytics>(
    `/analytics/org${rangeQuery(range)}`,
    { signal },
  );
}

export function getPersonalAnalytics(
  options: AnalyticsRangeOptions = {},
): Promise<PersonalAnalytics> {
  const { signal, ...range } = options;

  return apiRequest<PersonalAnalytics>(`/analytics/me${rangeQuery(range)}`, {
    signal,
  });
}

function rangeQuery({ from, to }: { from?: Date; to?: Date }): string {
  const query = new URLSearchParams();

  if (from) {
    query.set("from", validDate(from, "Range start").toISOString());
  }

  if (to) {
    query.set("to", validDate(to, "Range end").toISOString());
  }

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

function validDate(value: Date, label: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return value;
}
