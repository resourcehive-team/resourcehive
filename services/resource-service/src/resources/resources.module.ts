import { Module } from '@nestjs/common';
import { ServiceAuthModule } from '@resourcehive/service-auth';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [ServiceAuthModule, CloudinaryModule],
  providers: [ResourcesService],
  controllers: [ResourcesController],
})
export class ResourcesModule {}
