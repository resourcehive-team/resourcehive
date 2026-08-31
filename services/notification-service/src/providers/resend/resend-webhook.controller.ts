import { Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { ResendWebhookService } from "./resend-webhook.service";

@Controller("notifications/webhooks/resend")
export class ResendWebhookController {
  constructor(private readonly webhooks: ResendWebhookService) {}
  @Post()
  handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers("svix-id") id: string,
    @Headers("svix-timestamp") timestamp: string,
    @Headers("svix-signature") signature: string,
  ) {
    if (!request.rawBody) throw new Error("Raw webhook body is unavailable");
    return this.webhooks.handle(request.rawBody, { id, timestamp, signature });
  }
}
