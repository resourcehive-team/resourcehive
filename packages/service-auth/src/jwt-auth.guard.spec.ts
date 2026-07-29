import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccessTokenVerifier } from "./access-token-verifier";
import { AuthenticatedRequest } from "./authenticated-user";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  const jwtService = new JwtService();
  const guard = new JwtAuthGuard(new AccessTokenVerifier(jwtService));
  const jwtSecret = "resourcehive-test-secret";
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it("accepts a valid Identity Service token and attaches the user", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
        organizationId: "ca1892ee-8552-408a-9b20-fdbed7152ddd",
        role: "member",
      },
      { secret: jwtSecret, expiresIn: "1h" },
    );
    const { context, request } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      userId: "561d85d2-8ada-44f7-8743-2719c3905dc5",
      email: "member@example.edu",
      organizationId: "ca1892ee-8552-408a-9b20-fdbed7152ddd",
      role: "member",
    });
  });

  it("accepts identity-only tokens without organization information", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
      },
      { secret: jwtSecret, expiresIn: "1h" },
    );
    const { context, request } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      organizationId: null,
      role: null,
    });
  });

  it("accepts a valid token from the ResourceHive authentication cookie", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
        organizationId: "ca1892ee-8552-408a-9b20-fdbed7152ddd",
        role: "member",
      },
      { secret: jwtSecret, expiresIn: "1h" },
    );
    const { context, request } = createContext({
      cookie: `another_cookie=value; resourcehive_access_token=${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      userId: "561d85d2-8ada-44f7-8743-2719c3905dc5",
      email: "member@example.edu",
    });
  });

  it("accepts a cookie parsed by framework middleware", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
      },
      { secret: jwtSecret, expiresIn: "1h" },
    );
    const { context } = createContext({
      cookies: { resourcehive_access_token: token },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejects a request without a Bearer token or authentication cookie", async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a malformed Authorization header", async () => {
    const { context } = createContext({
      authorization: "not-a-bearer-token",
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a token signed with another secret", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
      },
      { secret: "different-secret", expiresIn: "1h" },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects an expired token", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "561d85d2-8ada-44f7-8743-2719c3905dc5",
        email: "member@example.edu",
      },
      { secret: jwtSecret, expiresIn: -1 },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a signed token without the required identity claims", async () => {
    const token = await jwtService.signAsync(
      { email: "member@example.edu" },
      { secret: jwtSecret, expiresIn: "1h" },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("reports server configuration errors separately from invalid tokens", async () => {
    delete process.env.JWT_SECRET;
    const { context } = createContext("Bearer token");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

function createContext(
  input?:
    | string
    | {
        authorization?: string;
        cookie?: string;
        cookies?: Record<string, unknown>;
      },
): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const options = typeof input === "string" ? { authorization: input } : input;
  const request: AuthenticatedRequest = {
    headers: {
      ...(options?.authorization
        ? { authorization: options.authorization }
        : {}),
      ...(options?.cookie ? { cookie: options.cookie } : {}),
    },
    ...(options?.cookies ? { cookies: options.cookies } : {}),
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;

  return { context, request };
}
