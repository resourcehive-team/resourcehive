import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService{

    async register(registrationData:any){
        return{
            message:"user registration successfully",
            data:registrationData,
        };
    }

    async login(loginData:any){
        return{
            message:"user login successfully",
            token:"dummy-jwt-token"
        };
    }
}