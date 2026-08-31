import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions } from "@nestjs/microservices";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getNotificationKafkaConfig } from "./kafka/kafka.config";

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ResourceHive Notification Service")
    .setDescription("Persistent, real-time, and fallback notification APIs")
    .setVersion("0.1")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const kafka = getNotificationKafkaConfig();
  if (kafka.enabled) {
    app.connectMicroservice<MicroserviceOptions>(kafka.options);
    await app.startAllMicroservices();
  }

  await app.listen(Number(process.env.PORT ?? 3003), "0.0.0.0");
}

void bootstrap();
