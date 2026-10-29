import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const COVERAGE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCoverageEventDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  subjectKey: number;

  /** Calendar day the material was taught, 'YYYY-MM-DD' (no timezone). */
  @Matches(COVERAGE_DATE_PATTERN, {
    message: 'coverageDate must be in YYYY-MM-DD format',
  })
  coverageDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one topic' })
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds: number[];
}

export class UpdateCoverageEventDto {
  @IsOptional()
  @Matches(COVERAGE_DATE_PATTERN, {
    message: 'coverageDate must be in YYYY-MM-DD format',
  })
  coverageDate?: string;

  /** Send an empty string to clear the note. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** When provided, replaces the event's topic set (must not be empty). */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'An event must contain at least one topic' })
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds?: number[];
}

