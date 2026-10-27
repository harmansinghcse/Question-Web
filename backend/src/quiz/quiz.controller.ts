import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizImporterService } from './quiz-importer.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { ImportQuizQuestionsDto } from './dto/import-quiz-questions.dto';
import { AdminQuizQueryDto, UpdateQuizQuestionDto } from './dto/admin-quiz-query.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole, AccountStatus } from '../users/entities/user.entity';

// Fallback guest user if revision is accessed without an active JWT session
const FALLBACK_GUEST_USER: SafeUser = {
  userId: 1,
  email: 'student@questionweb.local',
  displayName: 'Revision Student',
  role: UserRole.STUDENT,
  accountStatus: AccountStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

@Controller('quiz')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly importerService: QuizImporterService,
  ) {}

  /**
   * 1. Academic hierarchy filters (Department -> Subject -> Chapter -> Topic)
   * Includes personalized student semester & department recommendation if logged in.
   */
  @Get('filters')
  @UseGuards(OptionalJwtAuthGuard)
  async getFilters(@CurrentUser('email') email?: string) {
    return this.quizService.getHierarchyFilters(email);
  }

  /**
   * 2. Live question counts matching selected subject, chapter, topics, and difficulty
   */
  @Get('counts')
  async getCounts(
    @Query('subjectKey') subjectKey?: string,
    @Query('chapterId') chapterId?: string,
    @Query('topicIds') topicIds?: string,
    @Query('difficulty') difficulty?: string,
    @Query('questionType') questionType?: string,
  ) {
    const parsedTopicIds = topicIds
      ? topicIds
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id))
      : undefined;

    return this.quizService.getQuestionCounts({
      subjectKey: subjectKey ? parseInt(subjectKey, 10) : undefined,
      chapterId: chapterId ? parseInt(chapterId, 10) : undefined,
      topicIds: parsedTopicIds,
      difficulty,
      questionType,
    });
  }

  /**
   * 3. Start a revision attempt: selects random eligible questions, creates QuizAttempt,
   * and returns questions strictly WITHOUT correct answers or explanations.
   */
  @Post('start')
  @UseGuards(OptionalJwtAuthGuard)
  async startRevision(
    @Body() dto: StartQuizDto,
    @CurrentUser() user?: SafeUser,
  ) {
    return this.quizService.startRevisionAttempt(dto, user || null);
  }

  /**
   * 4. Submit an attempt: grades answers server-side, saves response rows,
   * calculates accuracy, and returns full question-by-question review & explanations.
   */
  @Post('submit')
  @UseGuards(OptionalJwtAuthGuard)
  async submitRevision(
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user?: SafeUser,
  ) {
    return this.quizService.submitRevisionAttempt(dto, user || null);
  }

  @Post('attempts/:id/submit')
  @UseGuards(OptionalJwtAuthGuard)
  async submitRevisionById(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user?: SafeUser,
  ) {
    dto.attemptId = id;
    return this.quizService.submitRevisionAttempt(dto, user || null);
  }

  /**
   * 5. User attempt history
   */
  @Get('attempts/history')
  @UseGuards(OptionalJwtAuthGuard)
  async getAttemptHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: SafeUser,
  ) {
    return this.quizService.getUserAttemptHistory(
      user?.userId || 0,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * 6. View review for a completed attempt
   */
  @Get('attempts/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getAttemptDetails(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser,
  ) {
    return this.quizService.getAttemptReview(id, user?.userId || null);
  }

  @Get('attempts/:id/review')
  @UseGuards(OptionalJwtAuthGuard)
  async getAttemptReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser,
  ) {
    return this.quizService.getAttemptReview(id, user?.userId || null);
  }

  // ================= ADMIN & SEEDING ENDPOINTS =================

  /**
   * 7. Batch Import AI-generated MCQs
   */
  @Post('admin/import')
  async importQuestions(@Body() dto: ImportQuizQuestionsDto) {
    return this.importerService.importBatch(dto);
  }

  /**
   * 8. Browse and filter questions in the quiz question bank
   */
  @Get('admin/questions')
  async adminFindQuestions(@Query() query: AdminQuizQueryDto) {
    return this.quizService.adminFindQuestions(query);
  }

  /**
   * 9. View single question with answer & explanation
   */
  @Get('admin/questions/:id')
  async adminFindOne(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.adminFindOne(id);
  }

  /**
   * 10. Update/correct question text, options, answer, explanation, or topics
   */
  @Patch('admin/questions/:id')
  async adminUpdateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.quizService.adminUpdateQuestion(id, dto);
  }

  /**
   * 11. Delete a question from the quiz question bank
   */
  @Delete('admin/questions/:id')
  async adminDeleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.adminDeleteQuestion(id);
  }
}
