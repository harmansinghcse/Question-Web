import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUpcomingExamDto {
  @IsInt()
  @Type(() => Number)
  deptId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  subjectKey?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  semester?: number;

  @IsString()
  @IsNotEmpty({ message: 'Exam title is required' })
  @MaxLength(150)
  title: string;

  @IsDateString(
    {},
    { message: 'examDate must be a valid ISO-8601 date string' },
  )
  examDate: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(600)
  @Type(() => Number)
  durationMinutes?: number = 120;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venue?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
