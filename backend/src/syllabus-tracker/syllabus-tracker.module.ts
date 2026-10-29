import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverageEvent } from './entities/coverage-event.entity';
import { CoverageEventTopic } from './entities/coverage-event-topic.entity';
import { SyllabusTrackerController } from './syllabus-tracker.controller';
import { SyllabusTrackerService } from './syllabus-tracker.service';
import { DepartmentsModule } from '../departments/departments.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoverageEvent, CoverageEventTopic]),
    DepartmentsModule,
    SubjectsModule,
  ],
  controllers: [SyllabusTrackerController],
  providers: [SyllabusTrackerService],
})
export class SyllabusTrackerModule {}

