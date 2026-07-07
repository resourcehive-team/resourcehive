import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [UsersModule, TenantsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
