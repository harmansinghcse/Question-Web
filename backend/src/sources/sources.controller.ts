import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateSourceDto } from './dto/create-source.dto';
import { SourcesService, SourceSummary } from './sources.service';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(): Promise<SourceSummary[]> {
    return this.sourcesService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateSourceDto,
  ): Promise<{ sourceId: number; sourceType: 'EXAM' | 'BOOK' }> {
    return this.sourcesService.createSource(dto);
  }
}
