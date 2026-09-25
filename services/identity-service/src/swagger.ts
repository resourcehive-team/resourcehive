import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const IDENTITY_SWAGGER_PATH = 'docs/identity';

export function setupIdentitySwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ResourceHive Identity API')
    .setDescription(
      'Authentication, account, Google OAuth, password, and profile APIs.',
    )
    .setVersion('1.0.0')
    .addServer('/', 'Current API gateway')
    .addBearerAuth(undefined, 'bearer')
    .addCookieAuth('resourcehive_access_token')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(IDENTITY_SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `${IDENTITY_SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${IDENTITY_SWAGGER_PATH}/openapi.yaml`,
    customSiteTitle: 'ResourceHive Identity API Docs',
    swaggerOptions: {
      withCredentials: true,
    },
  });
}
