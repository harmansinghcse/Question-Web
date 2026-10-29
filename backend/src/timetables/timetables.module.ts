import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Timetable } from './entities/timetable.entity';
import { TimetableEntry } from './entities/timetable-entry.entity';
import { TimetablesService } from './timetables.service';
import { TimetablesController } from './timetables.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Timetable, TimetableEntry]),
    DepartmentsModule,
    SubjectsModule,
  ],
  controllers: [TimetablesController],
  providers: [TimetablesService],
  exports: [TimetablesService, TypeOrmModule],
})
export class TimetablesModule {}
