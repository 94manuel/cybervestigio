import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { basicWafMiddleware } from './common/middleware/basic-waf.middleware';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  const port = config.get<number>('PORT') ?? 4000;
  const wafEnabled = String(config.get<string>('WAF_ENABLED') ?? 'true').toLowerCase() !== 'false';

  app.use(helmet());
  if (wafEnabled) {
    app.use(basicWafMiddleware);
  }
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CyberVestigio API')
    .setDescription('API administrativa y pública para el portal CyberVestigio.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  console.info(`CyberVestigio API disponible en http://localhost:${port}/api/v1`);
}

void bootstrap();
