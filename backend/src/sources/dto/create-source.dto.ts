import { IsIn } from 'class-validator';
import { SOURCE_TYPES } from '../entities/source.entity';
import type { SourceType } from '../entities/source.entity';

export class CreateSourceDto {
  @IsIn(SOURCE_TYPES, {
    message: `sourceType must be one of: ${SOURCE_TYPES.join(', ')}`,
  })
  sourceType: SourceType;
}
