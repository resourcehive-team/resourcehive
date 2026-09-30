import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { DeliveryProvider } from "./delivery-provider";
import { DeliveryRepository } from "./delivery.repository";
import { FcmPushProvider } from "./fcm.provider";
import { ResendEmailProvider } from "./resend.provider";
import { decideRetry } from "./retry-policy";

@Injectable()
export class DeliveryWorkerService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly email: ResendEmailProvider,
    private readonly push: FcmPushProvider,
  ) {}
  async process(id: string): Promise<void> {
    const delivery = await this.repository.claim(id);
    if (!delivery) return;
    const provider = this.providerFor(delivery.channel);
    try {
      if (!delivery.subject || !delivery.body) {
        throw new Error("Delivery content is missing");
      }
      const result = await provider.send({
        deliveryId: id,
        destination: delivery.destination,
        subject: delivery.subject,
        body: delivery.body,
        data: delivery.data as Record<string, unknown>,
      });
      await this.repository.complete(
        id,
        result.providerMessageId,
        delivery.channel === "EMAIL",
      );
    } catch (error) {
      await this.repository.fail(id, decideRetry(error, delivery.attemptCount));
    }
  }
  private providerFor(channel: string): DeliveryProvider {
    if (channel === "EMAIL") return this.email;
    if (channel === "PUSH") return this.push;
    throw new Error(`Unsupported delivery channel ${channel}`);
  }
}

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
