import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions } from "@nestjs/microservices";
import { AppModule } from "./app.module";
import { getNotificationKafkaConfig } from "./kafka/kafka.config";
import { setupNotificationSwagger } from "./swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupNotificationSwagger(app);

  const kafka = getNotificationKafkaConfig();
  if (kafka.enabled) {
    app.connectMicroservice<MicroserviceOptions>(kafka.options);
    await app.startAllMicroservices();
  }

  await app.listen(Number(process.env.PORT ?? 3003), "0.0.0.0");
}

void bootstrap();
