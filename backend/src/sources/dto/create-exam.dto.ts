import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { EXAM_MONTHS, EXAM_TYPES } from '../entities/exam.entity';
import type { ExamMonth, ExamType } from '../entities/exam.entity';

export class CreateExamDto {
  @IsIn(EXAM_TYPES, {
    message: `examType must be one of: ${EXAM_TYPES.join(', ')}`,
  })
  examType: ExamType;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'examYear must be an integer' })
  @Min(1950, { message: 'examYear must be 1950 or later' })
  @Max(2100, { message: 'examYear must be 2100 or earlier' })
  examYear: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'semesterNo must be an integer' })
  @Min(1, { message: 'semesterNo must be between 1 and 10' })
  @Max(10, { message: 'semesterNo must be between 1 and 10' })
  semesterNo: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt({ message: 'subjectKey must be a valid integer' })
  @Min(1, { message: 'subjectKey must be greater than 0' })
  subjectKey: number;

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
}
