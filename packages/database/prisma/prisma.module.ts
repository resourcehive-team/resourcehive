import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WorkerPrismaService } from './worker-prisma.service';
import { PlatformReportPrismaService } from './platform-report-prisma.service';

@Global()
@Module({
  providers: [PrismaService, WorkerPrismaService, PlatformReportPrismaService],
  exports: [PrismaService, WorkerPrismaService, PlatformReportPrismaService],
})
export class PrismaModule {}
