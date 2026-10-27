import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { ExamsController } from './exams.controller';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  controllers: [SourcesController, ExamsController, BooksController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
