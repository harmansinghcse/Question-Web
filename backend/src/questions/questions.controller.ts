import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import {
  CreatedQuestion,
  QuestionWithTopics,
  QuestionsService,
} from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  findAll(): Promise<QuestionWithTopics[]> {
    return this.questionsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateQuestionDto): Promise<CreatedQuestion> {
    return this.questionsService.create(dto);
  }
}
