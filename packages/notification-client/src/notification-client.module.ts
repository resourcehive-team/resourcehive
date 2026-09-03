import { DynamicModule, Module } from "@nestjs/common";
import { KafkaNotificationTransport } from "./kafka-notification.transport";
import {
  getNotificationKafkaOptions,
  NOTIFICATION_CLIENT_OPTIONS,
  NotificationClientOptions,
} from "./notification-client.options";
import { NotificationClientService } from "./notification-client.service";

@Module({})
export class NotificationClientModule {
  static register(options: NotificationClientOptions): DynamicModule {
    return {
      module: NotificationClientModule,
      global: true,
      providers: [
        {
          provide: NOTIFICATION_CLIENT_OPTIONS,
          useFactory: () => getNotificationKafkaOptions(options),
        },
        KafkaNotificationTransport,
        NotificationClientService,
      ],
      exports: [NotificationClientService],
    };
  }
}
