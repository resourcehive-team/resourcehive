import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const NOTIFICATION_SWAGGER_PATH = "docs/notification";

export function setupNotificationSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("ResourceHive Notification API")
    .setDescription("Authenticated in-app notifications and browser-push APIs.")
    .setVersion("1.0.0")
    .addServer("/", "Current API gateway")
    .addBearerAuth(undefined, "bearer")
    .addCookieAuth("resourcehive_access_token")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(NOTIFICATION_SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `${NOTIFICATION_SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${NOTIFICATION_SWAGGER_PATH}/openapi.yaml`,
    customSiteTitle: "ResourceHive Notification API Docs",
    swaggerOptions: {
      withCredentials: true,
    },
  });
}
