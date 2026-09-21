import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(cookieParser());

  // Webhook route needs the RAW body to verify Razorpay's signature.
  // All other routes get normal JSON parsing.
  app.use('/payments/webhook', express.raw({ type: '*/*' }));
  app.use('/delivery/webhook/uber', express.raw({ type: '*/*' }));
  app.use(express.json());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: ['http://localhost:3002', 'http://192.168.1.58:3002'],
    credentials: true,
  });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
