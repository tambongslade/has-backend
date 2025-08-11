import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const appModule = await AppModule.forRootAsync();
  const app = await NestFactory.create(appModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Admin panel removed (AdminJS integration disabled)

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  const config = new DocumentBuilder()
    .setTitle('HAS API')
    .setDescription('The HAS API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  const baseUrl = `http://localhost:${port}`;

  // Log important links
  logger.log(`🚀 Application is running on: ${baseUrl}`);
  logger.log(`📚 Swagger Documentation: ${baseUrl}/api/docs`);
  // Admin panel removed
  logger.log(`💚 Health Check: ${baseUrl}/api/v1/health`);
  logger.log(`🔐 Authentication Base: ${baseUrl}/api/v1/auth`);

  const server = app.getHttpServer();
  const router = server._router;
  if (router) {
    const availableRoutes: any[] = router.stack
      .map((layer) => {
        if (layer.route) {
          return {
            route: {
              path: layer.route?.path,
              method: layer.route?.stack[0].method,
            },
          };
        }
      })
      .filter((item) => item !== undefined);
    logger.log('Available routes:');
    console.table(availableRoutes.map((r) => r.route));
  }
}
bootstrap();
