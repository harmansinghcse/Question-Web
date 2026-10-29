import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CloudinaryService } from './cloudinary.service';
import type { CloudinarySignatureResponse } from './cloudinary.service';
import { FilterQuestionsDto } from './dto/filter-questions.dto';
import { QuestionsService } from './questions.service';
import type {
  CreatedQuestion,
  QuestionDetail,
  QuestionWithTopics,
} from './questions.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole } from '../users/entities/user.entity';
import { DepartmentsService } from '../departments/departments.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get('upload-signature')
  getUploadSignature(): CloudinarySignatureResponse {
    return this.cloudinaryService.getUploadSignature();
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query() query?: FilterQuestionsDto,
    @CurrentUser() currentUser?: SafeUser | null,
  ): Promise<QuestionWithTopics[]> {
    const filterDto = { ...(query || {}) };

    // Enforce department isolation for authenticated students
    if (currentUser && currentUser.role === UserRole.STUDENT) {
      const studentDept = await this.departmentsService.resolveFromEmail(
        currentUser.email,
      );
      if (studentDept) {
        filterDto.deptId = studentDept.deptId;
      }
    }

    return this.questionsService.findAll(filterDto);
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
