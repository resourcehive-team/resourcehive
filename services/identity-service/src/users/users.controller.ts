import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { HeaderAuthGuard } from '../auth/header-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(
    @Body()
    body: {
      tenantId: string;
      fullName: string;
      email: string;
      passwordHash: string;
    },
  ) {
    return this.usersService.createUser(
      body.tenantId,
      body.fullName,
      body.email,
      body.passwordHash,
    );
  }

  @UseGuards(HeaderAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // A temporary debug endpoint 
  @UseGuards(HeaderAuthGuard)
  @Get('debug-headers')
  async debugHeaders(@Request() req) {
    return {
      message: "Here is exactly what the backend received from NGINX:",
      receivedHeaders: req.headers,
      reconstructedUserObject: req.user
    };
  }
}
