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
  BadRequestException,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { Topic } from './entities/topic.entity';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  findAll(@Query('chapterId') chapterId?: string) {
    if (chapterId === undefined) {
      return this.topicsService.findAll();
    }

    const id = Number(chapterId);

    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('chapterId must be a positive integer');
    }

    return this.topicsService.findAll(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Topic>) {
    return this.topicsService.create(data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Topic>) {
    return this.topicsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.remove(id);
  }
}
