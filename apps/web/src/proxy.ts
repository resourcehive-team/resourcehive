import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const accessTokenCookie = "resourcehive_access_token";
const anonymousOnlyRoutes = new Set([
  "/login",
  "/signup/status",
  "/verify-email",
]);

async function hasValidAccessToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(accessTokenCookie)?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret || jwtSecret === "change_me") {
    return false;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(jwtSecret),
      {
        algorithms: ["HS256"],
      },
    );

    return (
      typeof payload.sub === "string" &&
      payload.sub.length > 0 &&
      typeof payload.email === "string" &&
      payload.email.length > 0
    );
  } catch {
    return false;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(accessTokenCookie);

  return response;
}

export async function proxy(request: NextRequest) {
  const isAuthenticated = await hasValidAccessToken(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", request.url),
    );
  }

  if (isAuthenticated && anonymousOnlyRoutes.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/signup/status",
    "/verify-email",
  ],
};
