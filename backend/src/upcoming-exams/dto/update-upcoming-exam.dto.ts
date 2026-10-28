import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUpcomingExamDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  deptId?: number;

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

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(600)
  @Type(() => Number)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  venue?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
