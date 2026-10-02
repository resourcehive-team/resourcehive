import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryWorkerService } from "./delivery-worker.service";

@Injectable()
export class DeliveryDispatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DeliveryDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly repository: DeliveryRepository,
    private readonly worker: DeliveryWorkerService,
  ) {}

  onModuleInit(): void {
    this.scheduleDispatch();
    this.timer = setInterval(
      () => this.scheduleDispatch(),
      Number(process.env.DELIVERY_POLL_INTERVAL_MS ?? 5_000),
    );
    this.timer.unref();
  }

  private scheduleDispatch(): void {
    void this.dispatchDue().catch((error: unknown) => {
      this.logger.error(
        "Unable to dispatch queued notifications",
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  async dispatchDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.repository.requeueStale();
      const deliveries = await this.repository.findDue();
      for (const delivery of deliveries) {
        await this.worker.process(delivery.id);
      }
    } finally {
      this.running = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
