import { Body, Controller, Post } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreatedQuestion, QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto): Promise<CreatedQuestion> {
    return this.questionsService.create(dto);
  }
}
