import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { Chapter } from './entities/chapter.entity';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get()
  findAll(@Query('subjectKey') subjectKey?: string) {
    if (subjectKey !== undefined) {
      const parsed = Number(subjectKey);

      if (!Number.isInteger(parsed) || parsed < 1) {
        return this.chaptersService.findAll(Number.NaN);
      }

      return this.chaptersService.findAll(parsed);
    }

    return this.chaptersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chaptersService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Chapter>) {
    return this.chaptersService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Chapter>,
  ) {
    return this.chaptersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chaptersService.remove(id);
  }
}
