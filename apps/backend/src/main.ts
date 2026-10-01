import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:9091', // must match your frontend exactly (no trailing slash)
    credentials: true, // ← this sends Access-Control-Allow-Credentials: true
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // add others if needed
  });

  await app.listen(process.env.PORT ?? 3000);
  // Set a Public folder for static assets

  console.log(`Application is running on: ${process.env.PORT}`);
}
bootstrap().then();
