import { BadRequestException, Injectable } from "@nestjs/common";
import { isUUID } from "class-validator";
import { NotificationRepository } from "./notification.repository";
import {
  CreateNotificationInput,
  NotificationRecord,
} from "./notification.types";

const MAX_TYPE_LENGTH = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2_000;

@Injectable()
export class NotificationPersistenceService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const normalized = {
      userId: input.userId.trim(),
      type: input.type.trim(),
      title: input.title.trim(),
      message: input.message.trim(),
    };

    this.requireText("userId", normalized.userId);
    this.requireUuid("userId", normalized.userId);
    this.requireText("type", normalized.type, MAX_TYPE_LENGTH);
    this.requireText("title", normalized.title, MAX_TITLE_LENGTH);
    this.requireText("message", normalized.message, MAX_MESSAGE_LENGTH);

    return this.notificationRepository.create(normalized);
  }

  findByIdForUser(
    notificationId: string,
    userId: string,
  ): Promise<NotificationRecord | null> {
    this.requireUuid("notificationId", notificationId);
    this.requireUuid("userId", userId);
    return this.notificationRepository.findByIdForUser({
      notificationId,
      userId,
    });
  }

  private requireText(
    field: string,
    value: string,
    maximumLength?: number,
  ): void {
    if (!value) {
      throw new BadRequestException(`${field} must not be blank`);
    }
    if (maximumLength && value.length > maximumLength) {
      throw new BadRequestException(
        `${field} must not exceed ${maximumLength} characters`,
      );
    }
  }

  private requireUuid(field: string, value: string): void {
    if (!isUUID(value)) {
      throw new BadRequestException(`${field} must be a UUID`);
    }
  }
}
