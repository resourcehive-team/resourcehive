import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setupResourceSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
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
    }),
  );

  setupResourceSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3004;

  await app.listen(port);
  console.log(`Resource Service is running on: http://localhost:${port}`);
  console.log(`Swagger docs at: http://localhost:${port}/docs/resource`);
}
void bootstrap();
