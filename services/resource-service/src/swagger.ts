import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const RESOURCE_SWAGGER_PATH = 'docs/resource';

export function setupResourceSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ResourceHive Resource API')
    .setDescription(
      'Organizations, memberships, resources, ratings, and resource images.',
    )
    .setVersion('1.0.0')
    .addServer('/', 'Current API gateway')
    .addBearerAuth(undefined, 'bearer')
    .addCookieAuth('resourcehive_access_token')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(RESOURCE_SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: `${RESOURCE_SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${RESOURCE_SWAGGER_PATH}/openapi.yaml`,
    customSiteTitle: 'ResourceHive Resource API Docs',
    swaggerOptions: {
      withCredentials: true,
    },
  });
}
