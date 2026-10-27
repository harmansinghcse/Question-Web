import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterQuestionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deptId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subjectKey?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chapterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  topicId?: number;

  @IsOptional()
  @IsString()
  topicIds?: string;

  @IsOptional()
  @IsString()
  quesType?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semester?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  search?: string;
}
