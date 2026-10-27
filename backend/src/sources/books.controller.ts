import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { BookItem, SourcesService } from './sources.service';

@Controller('books')
export class BooksController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(): Promise<BookItem[]> {
    return this.sourcesService.findAllBooks();
  }

  @Post()
  create(@Body() dto: CreateBookDto): Promise<BookItem> {
    return this.sourcesService.createBook(dto);
  }
}
