import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubjectsModule } from './subjects/subjects.module';
import { ChaptersModule } from './chapters/chapters.module';
import { TopicsModule } from './topics/topics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { QuestionsModule } from './questions/questions.module';
import { SourcesModule } from './sources/sources.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { UpcomingExamsModule } from './upcoming-exams/upcoming-exams.module';
import { TimetablesModule } from './timetables/timetables.module';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(), // Initializes the Cron job scheduler
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),
        ssl: {
          ca: fs.readFileSync(
            path.join(process.cwd(), 'certs', 'ca.pem'),
            'utf8',
          ),
          rejectUnauthorized: true,
        },
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: 5,
        retryDelay: 3000,
        connectTimeout: 20000,
        extra: {
          connectionLimit: 10,
          waitForConnections: true,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          maxIdle: 2,
          idleTimeout: 30000,
        },
      }),
    }),
    SubjectsModule,
    ChaptersModule,
    TopicsModule,
    DashboardModule,
    DepartmentsModule,
    QuestionsModule,
    SourcesModule,
    UsersModule,
    AuthModule,
    QuizModule,
    UpcomingExamsModule,
    TimetablesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
