import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassType, DayOfWeek } from '../entities/timetable-entry.entity';

export class UpdateTimetableEntryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  subjectKey?: number;

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  classroom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  teacher?: string;

  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;
}
