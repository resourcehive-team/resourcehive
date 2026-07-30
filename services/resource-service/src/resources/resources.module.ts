import { Module } from '@nestjs/common';
import { ServiceAuthModule } from '@resourcehive/service-auth';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [ServiceAuthModule],
  providers: [ResourcesService],
  controllers: [ResourcesController],
})
export class ResourcesModule {}
