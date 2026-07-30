import { Module } from '@nestjs/common';
import { ServiceAuthModule } from '@resourcehive/service-auth';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [ServiceAuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
