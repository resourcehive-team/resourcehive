import { Controller, Get, Module, UseGuards } from "@nestjs/common";
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

  it("provides the guard to a protected controller in a consuming module", async () => {
    @Controller("protected")
    class ConsumerController {
      @Get()
      @UseGuards(JwtAuthGuard)
      read(): string {
        return "ok";
      }
    }

    @Module({
      imports: [ServiceAuthModule],
      controllers: [ConsumerController],
    })
    class ConsumerModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    expect(moduleRef.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);
    await moduleRef.close();
  });
});
