import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): any => {
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;

        if (process.env.NODE_ENV === 'test') {
          return { ttl: 600 * 1000 };
        }

        return {
          stores: [new KeyvRedis(`redis://${host}:${port}`)],
          ttl: 600 * 1000, // 10 minutes default TTL
        };
      },
      inject: [ConfigService],
    }),
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
