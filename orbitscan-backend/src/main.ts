import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Lock CORS to production origin or fallback to '*'
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`🛰️ OrbitScan API Gateway successfully launched on port ${port}`);
}
bootstrap();
