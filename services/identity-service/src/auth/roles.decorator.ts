import { SetMetadata } from "@nestjs/common";
import { SetMetadata as NestSetMetadata } from "@nestjs/common";

// 1. Define metadata key and Create roles decorator
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => NestSetMetadata(ROLES_KEY, roles);