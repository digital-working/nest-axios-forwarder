import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: true,
  });
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);

  // Increase body size limit to handle large payloads (e.g., SSL certificates)
  // Default is 100kb, we're increasing to 10MB
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // Enable validation for all incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that are not in the DTO
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 8080);

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
});
