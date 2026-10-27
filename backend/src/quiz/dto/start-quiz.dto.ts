import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuizDifficultyFilter {
  ALL = 'ALL',
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuizTypeFilter {
  ALL = 'ALL',
  MCQ = 'MCQ',
  FILLUPS = 'FILLUPS',
  TRUE_FALSE = 'TRUE_FALSE',
}

export class StartQuizDto {
  @IsInt()
  @Type(() => Number)
  subjectKey: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chapterId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  topicIds?: number[];

  @IsOptional()
  @IsEnum(QuizDifficultyFilter)
  difficulty?: QuizDifficultyFilter = QuizDifficultyFilter.ALL;

  @IsOptional()
  @IsEnum(QuizTypeFilter)
  questionType?: QuizTypeFilter = QuizTypeFilter.ALL;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  count?: number = 10;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  retryAttemptId?: number;
}

