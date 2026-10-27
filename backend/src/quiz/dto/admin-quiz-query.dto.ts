import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizDifficulty, QuizQuestionType } from '../entities/quiz-question.entity';

export class AdminQuizQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  subjectKey?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chapterId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  topicId?: number;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty;

  @IsOptional()
  @IsEnum(QuizQuestionType)
  questionType?: QuizQuestionType;
}

export class UpdateQuizQuestionDto {
  @IsOptional()
  @IsEnum(QuizQuestionType)
  questionType?: QuizQuestionType;

  @IsOptional()
  @IsString()
  quesText?: string;

  @IsOptional()
  options?: Record<string, string> | string[] | null;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers?: string[] | null;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chapterId?: number;

  @IsOptional()
  topicIds?: number[];
}
