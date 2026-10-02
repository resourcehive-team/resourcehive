import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const BOOKING_SWAGGER_PATH = "docs/booking";

export function setupBookingSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("ResourceHive Booking API")
    .setDescription(
      "Resource slots, bookings, completion, cancellation, and points APIs.",
    )
    .setVersion("1.0.0")
    .addServer("/", "Current API gateway")
    .addBearerAuth(undefined, "bearer")
    .addCookieAuth("resourcehive_access_token")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(BOOKING_SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `${BOOKING_SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${BOOKING_SWAGGER_PATH}/openapi.yaml`,
    customSiteTitle: "ResourceHive Booking API Docs",
    swaggerOptions: {
      withCredentials: true,
    },
  });
}
