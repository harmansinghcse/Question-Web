import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CloudinaryService } from './cloudinary.service';
import type { CloudinarySignatureResponse } from './cloudinary.service';
import { QuestionsService } from './questions.service';
import type {
  CreatedQuestion,
  QuestionDetail,
  QuestionWithTopics,
} from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('upload-signature')
  getUploadSignature(): CloudinarySignatureResponse {
    return this.cloudinaryService.getUploadSignature();
  }

  @Get()
  findAll(): Promise<QuestionWithTopics[]> {
    return this.questionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<QuestionDetail> {
    return this.questionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto): Promise<CreatedQuestion> {
    return this.questionsService.create(dto);
  }
}
