import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SOURCE_TYPES } from '../entities/source.entity';
import type { SourceType } from '../entities/source.entity';
import { EXAM_MONTHS, EXAM_TYPES } from '../entities/exam.entity';
import type { ExamMonth, ExamType } from '../entities/exam.entity';

export class CreateSourceDto {
  @IsNotEmpty({ message: 'sourceType is required' })
  @IsString({ message: 'sourceType must be a string' })
  @IsIn(SOURCE_TYPES, {
    message: `sourceType must be one of: ${SOURCE_TYPES.join(', ')}`,
  })
  sourceType: SourceType;

  // Exam fields (used when sourceType === 'EXAM')
  @IsOptional()
  @IsIn(EXAM_TYPES, {
    message: `examType must be one of: ${EXAM_TYPES.join(', ')}`,
  })
  examType?: ExamType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'examYear must be an integer' })
  @Min(1950, { message: 'examYear must be 1950 or later' })
  @Max(2100, { message: 'examYear must be 2100 or earlier' })
  examYear?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'semesterNo must be an integer' })
  @Min(1, { message: 'semesterNo must be between 1 and 10' })
  @Max(10, { message: 'semesterNo must be between 1 and 10' })
  semesterNo?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'subjectKey must be a valid integer' })
  @Min(1, { message: 'subjectKey must be greater than 0' })
  subjectKey?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.trim().toUpperCase()
      : undefined,
  )
  @IsIn(EXAM_MONTHS, {
    message: `month must be one of: ${EXAM_MONTHS.join(', ')}`,
  })
  month?: ExamMonth;

  // Book fields (used when sourceType === 'BOOK')
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'bookName must be a string' })
  @MaxLength(200, { message: 'bookName must not exceed 200 characters' })
  bookName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'authorName must be a string' })
  @MaxLength(200, { message: 'authorName must not exceed 200 characters' })
  authorName?: string;
}
