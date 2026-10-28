import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTimetableDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  deptId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  semester?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
