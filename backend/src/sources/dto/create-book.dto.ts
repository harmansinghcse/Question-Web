import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBookDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'bookName must be a string' })
  @IsNotEmpty({ message: 'bookName must not be empty' })
  @MaxLength(200, { message: 'bookName must not exceed 200 characters' })
  bookName: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'authorName must be a string' })
  @IsNotEmpty({ message: 'authorName must not be empty' })
  @MaxLength(200, { message: 'authorName must not exceed 200 characters' })
  authorName: string;
}
