import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',

    // Question Web deployed frontend
    'https://question-web-git-main-bit-by-bit4.vercel.app',
  ];

  const rawCors = process.env.CORS_ORIGIN;

  const allowedOrigins = [
    ...new Set([
      ...defaultOrigins,
      ...(rawCors
        ? rawCors
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        : []),
    ]),
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`Blocked CORS origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Refresh-Token',
      'Accept',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`Question Web API running on port ${port}`);
}

void bootstrap();
