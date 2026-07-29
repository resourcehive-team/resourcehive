import {
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AccessTokenVerifier } from "./access-token-verifier";

describe("AccessTokenVerifier", () => {
  const jwtService = new JwtService();
  const verifier = new AccessTokenVerifier(jwtService);
  const secret = "resourcehive-token-verifier-test-secret";
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("returns normalized authenticated identity for a valid token", async () => {
    const token = await jwtService.signAsync(
      {
        sub: "user-id",
        email: "user@example.edu",
        organizationId: "organization-id",
        role: "member",
      },
      { secret, expiresIn: "1h" },
    );

    await expect(verifier.verify(token)).resolves.toEqual({
      userId: "user-id",
      email: "user@example.edu",
      organizationId: "organization-id",
      role: "member",
    });
  });

  it("rejects expired and incorrectly signed tokens", async () => {
    const expired = await jwtService.signAsync(
      { sub: "user-id", email: "user@example.edu" },
      { secret, expiresIn: -1 },
    );
    const incorrect = await jwtService.signAsync(
      { sub: "user-id", email: "user@example.edu" },
      { secret: "incorrect-secret", expiresIn: "1h" },
    );

    await expect(verifier.verify(expired)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(verifier.verify(incorrect)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects signed tokens without required identity claims", async () => {
    const token = await jwtService.signAsync(
      { email: "user@example.edu" },
      { secret, expiresIn: "1h" },
    );
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("reports missing server configuration separately", async () => {
    delete process.env.JWT_SECRET;
    await expect(verifier.verify("token")).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
