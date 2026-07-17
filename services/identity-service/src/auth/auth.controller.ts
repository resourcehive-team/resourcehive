import { Controller,Post,Body,HttpCode,HttpStatus } from "@nestjs/common";
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

}