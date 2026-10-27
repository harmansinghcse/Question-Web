import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamItem, SourcesService } from './sources.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(@Query('subjectKey') subjectKey?: string): Promise<ExamItem[]> {
    const key = subjectKey ? parseInt(subjectKey, 10) : undefined;
    return this.sourcesService.findAllExams(Number.isNaN(key) ? undefined : key);
  }

  @Post()
  create(@Body() dto: CreateExamDto): Promise<ExamItem> {
    return this.sourcesService.createExam(dto);
  }
}
