import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Source } from './entities/source.entity';
import { Exam } from './entities/exam.entity';
import { Book } from './entities/book.entity';
import { BooksController } from './books.controller';
import { ExamsController } from './exams.controller';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [TypeOrmModule.forFeature([Source, Exam, Book])],
  controllers: [SourcesController, ExamsController, BooksController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
