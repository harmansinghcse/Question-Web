import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subject]), DepartmentsModule],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [TypeOrmModule, SubjectsService],
})
export class SubjectsModule {}
