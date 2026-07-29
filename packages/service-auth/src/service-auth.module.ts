import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenVerifier } from "./access-token-verifier";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [JwtModule.register({})],
  providers: [AccessTokenVerifier, JwtAuthGuard],
  exports: [AccessTokenVerifier, JwtAuthGuard, JwtModule],
})
export class ServiceAuthModule {}
