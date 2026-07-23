import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { HeaderAuthGuard } from '../auth/header-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(HeaderAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // A temporary debug endpoint
  @UseGuards(HeaderAuthGuard)
  @Get('debug-headers')
  async debugHeaders(@Request() req: { headers: unknown; user?: unknown }) {
    return {
      message: 'Here is exactly what the backend received from NGINX:',
      receivedHeaders: req.headers,
      reconstructedUserObject: req.user,
    };
  }
}
