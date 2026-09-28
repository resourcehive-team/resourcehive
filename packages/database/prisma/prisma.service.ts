import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        'Database connection failed at startup; will retry lazily on first query',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
