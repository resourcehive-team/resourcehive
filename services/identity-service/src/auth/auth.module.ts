import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports:[
        UsersModule,
        TenantsModule,
        JwtModule.register({
            global: true, 
            secret: process.env.JWT_SECRET || 'fallback_secret', 
            signOptions: { expiresIn: '1h' }, 
        })
    ],
    controllers:[AuthController],
    providers:[AuthService]
})

export class AuthModule{}