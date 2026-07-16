import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: { tenantId: string; fullName: string; email: string; passwordHash: string }) {
    return this.usersService.createUser(body.tenantId, body.fullName, body.email, body.passwordHash);
  }

  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers(@Request() req ) {
    return this.usersService.findAll();
  }
}
