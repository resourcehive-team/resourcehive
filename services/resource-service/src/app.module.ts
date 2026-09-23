import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServiceAuthModule } from '@resourcehive/service-auth';
import { NotificationClientModule } from '@resourcehive/notification-client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@resourcehive/database';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ResourcesModule } from './resources/resources.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ServiceAuthModule,
    NotificationClientModule.register({ producer: 'resource-service' }),
    OrganizationsModule,
    MembershipsModule,
    ResourcesModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
