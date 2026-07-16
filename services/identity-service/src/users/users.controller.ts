import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: { tenantId: string; fullName: string; email: string; passwordHash: string }) {
    return this.usersService.createUser(body.tenantId, body.fullName, body.email, body.passwordHash);
  }

  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Get(':email')
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }
}
