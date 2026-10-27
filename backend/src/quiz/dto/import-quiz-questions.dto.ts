import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizDifficulty, QuizQuestionType } from '../entities/quiz-question.entity';

export class RawImportQuestionDto {
  @IsOptional()
  @IsEnum(QuizQuestionType)
  questionType?: QuizQuestionType = QuizQuestionType.MCQ;

  @IsOptional()
  @IsString()
  quesText?: string;

  /**
   * Alias for quesText commonly used in AI JSON generators
   */
  @IsOptional()
  @IsString()
  questionText?: string;

  /**
   * Required for MCQ; optional for FILLUPS and TRUE_FALSE.
   */
  @IsOptional()
  options?: Record<string, string> | string[] | null;

  /**
   * Correct answer: string (e.g. "A", "Binary Search Tree") or boolean (true/false)
   */
  @IsOptional()
  correctAnswer?: string | boolean;

  /**
   * List of accepted strings for FILLUPS
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @IsString()
  @IsNotEmpty()
  explanation: string;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty = QuizDifficulty.MEDIUM;

  @IsInt()
  @Type(() => Number)
  chapterId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  topicIds?: number[];
}

export class ImportQuizQuestionsDto {
  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RawImportQuestionDto)
  questions: RawImportQuestionDto[];
}
