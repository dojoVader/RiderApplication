import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import {ValidationPipe} from "@nestjs/common";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // configure swagger

  const config = new DocumentBuilder()
    .setTitle('Rider Application API')
    .setDescription('API documentation for the Rider Application')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  // Setup the Swagger Information
  SwaggerModule.setup('api',app,documentFactory());

  app.enableCors({
    origin: 'http://localhost:9091', // must match your frontend exactly (no trailing slash)
    credentials: true, // ← this sends Access-Control-Allow-Credentials: true
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // add others if needed
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
  // Set a Public folder for static assets

  console.log(`Application is running on: ${process.env.PORT}`);
}
bootstrap().then();
