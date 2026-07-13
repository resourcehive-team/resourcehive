import { Controller,Post,Body,HttpCode,HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller('auth')
export class AuthController{
    constructor(private readonly authService:AuthService){}

    @Post('register')
    async register(@Body() registrationData:any){
        return this.authService.register(registrationData);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginData:any){
        return this.authService.login(loginData);
    }

}