import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationClientModule } from '@resourcehive/notification-client';
import { EmailService } from '../email/email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({}),
    NotificationClientModule.register({ producer: 'identity-service' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtAuthGuard],
})
export class AuthModule {}
