import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

@Injectable()
export class PlatformReportPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.PLATFORM_REPORT_DATABASE_URL ?? process.env.APP_DATABASE_URL;
    if (!url) throw new Error('APP_DATABASE_URL is required');
    super({ datasources: { db: { url } } });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
