import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import exec from "k6/execution";

const errors = new Counter("resourcehive_unexpected_responses");
const baseUrl = (__ENV.PERF_BASE_URL || "http://localhost:8088").replace(
  /\/$/,
  "",
);
const userCount = Number(__ENV.PERF_USER_COUNT || 100);
const userPrefix = __ENV.PERF_USER_PREFIX || "perf-user";
const password = __ENV.PERF_USER_PASSWORD || "PerfOnly-1024!";
const gatewayHeaders = __ENV.PERF_HOST_HEADER
  ? { Host: __ENV.PERF_HOST_HEADER }
  : {};
const organizationIds = (
  __ENV.PERF_ORGANIZATION_IDS ||
  "f0000000-0000-4000-8000-000000000001,f0000000-0000-4000-8000-000000000002"
).split(",");
const vus = Number(__ENV.PERF_VUS || 10);

export const options = {
  noCookiesReset: true,
  stages: [
    { duration: __ENV.PERF_RAMP || "30s", target: vus },
    { duration: __ENV.PERF_DURATION || "2m", target: vus },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    resourcehive_unexpected_responses: ["count==0"],
  },
};

let authenticated = false;
let iteration = 0;
let invalidResourceResponseLogs = 0;

export default function () {
  const zeroBasedUserIndex = (__VU - 1) % userCount;
  const email = `${userPrefix}-${String(zeroBasedUserIndex + 1).padStart(3, "0")}@resourcehive.test`;
  const organizationId =
    organizationIds[zeroBasedUserIndex % organizationIds.length].trim();

  if (!authenticated) {
    const login = http.post(
      `${baseUrl}/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { ...gatewayHeaders, "Content-Type": "application/json" },
        tags: { name: "auth_login" },
      },
    );
    const accepted = check(login, {
      "login returns success": (response) => response.status === 200,
    });
    if (!accepted) {
      errors.add(1);
      exec.test.abort(`Load-test login failed with HTTP ${login.status}. Run the fixture preparation command and verify its result before retrying.`);
    }
    authenticated = true;
  }

  const cases = [
    () => request("GET", "/auth/me", "auth_me"),
    () => browseTenantResources(organizationId),
    () => rejectsOtherTenant((zeroBasedUserIndex + 1) % organizationIds.length),
    () => request("GET", "/bookings/me?skip=0&take=20", "booking_read"),
    () => request("GET", "/analytics/me", "analytics_personal"),
    () => request("GET", "/disputes/me", "disputes_personal"),
    () => request("GET", "/notifications?skip=0&take=20", "notifications_read"),
    () => bookingCycle(zeroBasedUserIndex),
  ];
  cases[iteration % cases.length]();

  if (iteration > 0 && iteration % 30 === 0) {
    const refresh = http.post(`${baseUrl}/auth/refresh`, null, {
      headers: gatewayHeaders,
      tags: { name: "auth_refresh" },
    });
    record(
      refresh,
      "refresh returns success",
      (response) => response.status === 200,
    );
  }

  iteration += 1;
  sleep(0.1);
}

function request(method, path, name) {
  const response = http.request(method, `${baseUrl}${path}`, null, {
    headers: gatewayHeaders,
    tags: { name },
  });
  record(
    response,
    `${name} returns success`,
    (value) => value.status >= 200 && value.status < 300,
  );
}

function browseTenantResources(organizationId) {
  const response = http.get(
    `${baseUrl}/resources/organization/${organizationId}?page=1&limit=20`,
    { headers: gatewayHeaders, tags: { name: "resource_browse" } },
  );
  const isSuccessful = check(response, {
    "resource browse returns success": (value) => value.status === 200,
  });
  if (!isSuccessful) {
    errors.add(1);
    return;
  }

  let body;
  try {
    body = JSON.parse(response.body);
  } catch {
    const hasJsonBody = check(response, {
      "resource browse returns valid JSON": () => false,
    });
    if (!hasJsonBody) errors.add(1);
    if (invalidResourceResponseLogs < 3) {
      console.error(
        `Resource browse returned status ${response.status} with ${response.body?.length || 0} body characters and content type ${response.headers["Content-Type"] || "none"}`,
      );
      invalidResourceResponseLogs += 1;
    }
    return;
  }
  const items = body?.data;
  const belongsToTenant = check(items, {
    "resource results remain within the authenticated tenant": (resources) =>
      Array.isArray(resources) && resources.length > 0 && resources.every(
        (resource) =>
          resource.ownerOrganizationId === organizationId ||
          resource.allowedOrganizations?.some(
            (entry) => entry.organizationId === organizationId,
          ),
      ),
  });
  if (!belongsToTenant) errors.add(1);
}

function rejectsOtherTenant(otherTenantIndex) {
  const otherOrganizationId = organizationIds[otherTenantIndex].trim();
  const response = http.get(
    `${baseUrl}/resources/organization/${otherOrganizationId}?page=1&limit=20`,
    {
      headers: gatewayHeaders,
      responseCallback: http.expectedStatuses(403),
      tags: { name: "tenant_isolation_denied" },
    },
  );
  record(
    response,
    "cross-tenant resource browse is forbidden",
    (value) => value.status === 403,
  );
}

function bookingCycle(userIndex) {
  const slotId = `f0000000-0000-4000-8000-${String(40_000 + userIndex).padStart(12, "0")}`;
  const created = http.post(
    `${baseUrl}/bookings`,
    JSON.stringify({ resourceSlotId: slotId }),
    {
      headers: { ...gatewayHeaders, "Content-Type": "application/json" },
      tags: { name: "booking_create" },
    },
  );
  const createdOk = check(created, {
    "booking create returns success": (response) => response.status === 201,
  });
  if (!createdOk) {
    errors.add(1);
    return;
  }

  const booking = JSON.parse(created.body);
  const bookingId = booking.id || booking.booking?.id;
  if (!bookingId) {
    errors.add(1);
    return;
  }

  const cancelled = http.patch(
    `${baseUrl}/bookings/${bookingId}/cancel`,
    JSON.stringify({ reason: "Synthetic performance test" }),
    {
      headers: { ...gatewayHeaders, "Content-Type": "application/json" },
      tags: { name: "booking_cancel" },
    },
  );
  record(
    cancelled,
    "booking cancellation returns success",
    (response) => response.status === 200,
  );
}

function record(response, label, predicate) {
  if (!check(response, { [label]: predicate })) errors.add(1);
}
