import { Controller,Post,Body,HttpCode,HttpStatus, Get, UseGuards, Req, Res } from "@nestjs/common";
import { Request, Response } from 'express';
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller('auth')
export class AuthController{
    constructor(private readonly authService:AuthService){}

    @Post('register')
    async register(@Body() registrationData:RegisterDto){
        return this.authService.register(registrationData);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginData:LoginDto){
        return this.authService.login(loginData);
    }

    @Get('validate')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    validate(@Req() req: Request, @Res() res: Response) {
        const user = req['user'];
        // Set headers for NGINX to capture and forward
        res.setHeader('X-User-Id', user.userId);
        res.setHeader('X-Tenant-Id', user.tenantId);
        res.setHeader('X-User-Role', user.role);
        res.setHeader('X-User-Email', user.email);
        
        return res.send();
    }
}