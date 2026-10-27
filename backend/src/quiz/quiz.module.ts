import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizQuestionTopic } from './entities/quiz-question-topic.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptResponse } from './entities/quiz-attempt-response.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Department } from '../departments/entities/department.entity';
import { QuizService } from './quiz.service';
import { QuizImporterService } from './quiz-importer.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizQuestion,
      QuizQuestionTopic,
      QuizAttempt,
      QuizAttemptResponse,
      Subject,
      Chapter,
      Topic,
      Department,
    ]),
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizImporterService],
  exports: [QuizService, QuizImporterService],
})
export class QuizModule {}
