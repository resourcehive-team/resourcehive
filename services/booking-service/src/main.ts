import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupBookingSwagger } from "./swagger";

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

  setupBookingSwagger(app);

  await app.listen(Number(process.env.PORT ?? 3002), "0.0.0.0");
  console.log(`Booking service is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger docs are available on: ${await app.getUrl()}/docs/booking`,
  );
}

void bootstrap();
