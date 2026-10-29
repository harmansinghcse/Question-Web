import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpcomingExam } from './entities/upcoming-exam.entity';
import { UpcomingExamsService } from './upcoming-exams.service';
import { UpcomingExamsController } from './upcoming-exams.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpcomingExam]),
    DepartmentsModule,
    SubjectsModule,
  ],
  controllers: [UpcomingExamsController],
  providers: [UpcomingExamsService],
  exports: [UpcomingExamsService, TypeOrmModule],
})
export class UpcomingExamsModule {}
