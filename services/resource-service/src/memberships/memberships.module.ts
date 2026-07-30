import { Module } from '@nestjs/common';
import { ServiceAuthModule } from '@resourcehive/service-auth';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [ServiceAuthModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
