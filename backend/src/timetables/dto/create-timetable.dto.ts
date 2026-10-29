import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTimetableDto {
  @IsInt()
  @Type(() => Number)
  deptId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  semester: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  division: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
