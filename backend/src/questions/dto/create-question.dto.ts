import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { QUESTION_TYPES } from '../entities/question.entity';
import type { QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'quesText must not be empty' })
  @MaxLength(16000)
  quesText: string;

  @IsIn(QUESTION_TYPES, {
    message: `quesType must be one of: ${QUESTION_TYPES.join(', ')}`,
  })
  quesType: QuestionType;

  @IsInt()
  @Min(1)
  sourceId: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one topic' })
  @ArrayUnique({ message: 'topicIds must not contain duplicates' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds: number[];
}
