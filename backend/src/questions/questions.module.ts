import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from '../topics/entities/topic.entity';
import { Question } from './entities/question.entity';
import { QuestionTopic } from './entities/question-topic.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionTopic, Topic])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
