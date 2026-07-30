import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api-client";
import {
  getAccessibleResources,
  getResourceDetails,
} from "@/lib/resource-service/resource-api";
import type {
  PaginatedResources,
  ResourceDetails,
} from "@/lib/resource-service/types";

vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe("resource API", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("uses the approved default catalogue pagination", async () => {
    const catalogue: PaginatedResources = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    apiRequestMock.mockResolvedValueOnce(catalogue);

    await expect(getAccessibleResources("organization-id")).resolves.toBe(
      catalogue,
    );
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/resources/organization/organization-id?page=1&limit=10",
      { signal: undefined },
    );
  });

  it("encodes IDs and sends only page, limit, and trimmed name search", async () => {
    const signal = new AbortController().signal;
    apiRequestMock.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
      totalPages: 0,
    });

    await getAccessibleResources(" organization/one ", {
      page: 2,
      limit: 5,
      search: "  lab bench  ",
      signal,
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/resources/organization/organization%2Fone?page=2&limit=5&search=lab+bench",
      { signal },
    );
  });

  it.each([
    ["empty organization ID", "", {}, "Organization ID is required."],
    ["zero page", "organization-id", { page: 0 }, "Page must be a positive integer."],
    ["fractional page", "organization-id", { page: 1.5 }, "Page must be a positive integer."],
    ["zero limit", "organization-id", { limit: 0 }, "Limit must be a positive integer."],
  ])("rejects an invalid %s", (_name, organizationId, options, message) => {
    expect(() => getAccessibleResources(organizationId, options)).toThrow(
      message,
    );
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("encodes organization and resource IDs for details", async () => {
    const details = {} as ResourceDetails;
    apiRequestMock.mockResolvedValueOnce(details);

    await expect(
      getResourceDetails("organization/one", "resource/two"),
    ).resolves.toBe(details);
    expect(apiRequestMock).toHaveBeenCalledWith(
      "/resources/organization/organization%2Fone/resource%2Ftwo",
      { signal: undefined },
    );
  });
});
