import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassType, DayOfWeek } from '../entities/timetable-entry.entity';

export class CreateTimetableEntryDto {
  @IsInt()
  @Type(() => Number)
  subjectKey: number;

  @IsEnum(DayOfWeek, {
    message: 'dayOfWeek must be one of: MON, TUE, WED, THU, FRI, SAT, SUN',
  })
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in 24-hour HH:mm format (e.g. 09:00)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in 24-hour HH:mm format (e.g. 10:00)',
  })
  endTime: string;

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
  classType?: ClassType = ClassType.LECTURE;
}
