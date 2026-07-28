import { Test } from "@nestjs/testing";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ServiceAuthModule } from "./service-auth.module";

describe("ServiceAuthModule", () => {
  it("can be imported by another NestJS service", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ServiceAuthModule],
    }).compile();

    expect(moduleRef.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);
    await moduleRef.close();
  });
});
