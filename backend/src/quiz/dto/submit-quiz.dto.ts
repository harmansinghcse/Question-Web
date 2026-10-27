import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerItemDto {
  @IsInt()
  @Type(() => Number)
  quizQuesId: number;

  @IsOptional()
  @IsString()
  selectedAnswer?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  timeSpentSeconds?: number;
}

export class SubmitQuizDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  attemptId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  timeTakenSeconds?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  timeSpentSeconds?: number = 0;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers?: QuizAnswerItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  responses?: QuizAnswerItemDto[];
}
