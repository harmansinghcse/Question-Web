import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from '../topics/entities/topic.entity';
import { Question } from './entities/question.entity';
import { QuestionImage } from './entities/question-image.entity';
import { QuestionTopic } from './entities/question-topic.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionTopic, QuestionImage, Topic]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService, CloudinaryService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
