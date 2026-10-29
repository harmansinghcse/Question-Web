import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';
import { SyllabusTrackerService } from './syllabus-tracker.service';
import {
  CreateCoverageEventDto,
  UpdateCoverageEventDto,
} from './dto/coverage-event.dto';

/**
 * Personal syllabus coverage. Every route requires authentication and acts
 * only on the authenticated user's own records (userId is taken from the
 * token, never from the request).
 */
@Controller('syllabus-tracker')
@UseGuards(JwtAuthGuard)
export class SyllabusTrackerController {
  constructor(private readonly service: SyllabusTrackerService) {}

  /** Academic context + department-scoped subject list with coverage metrics. */
  @Get('context')
  getContext(@CurrentUser() user: SafeUser) {
    return this.service.getContext(user);
  }

  /** Per-subject coverage summary for the authenticated user. */
  @Get('summary')
  getSummary(@CurrentUser() user: SafeUser) {
    return this.service.getSummary(user);
  }

  /** Coverage tree + stats + weekly activity for a subject, optionally as of a date (YYYY-MM-DD). */
  @Get('subjects/:subjectKey/tree')
  getTree(
    @Param('subjectKey', ParseIntPipe) subjectKey: number,
    @Query('asOf') asOf: string | undefined,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.getTree(user, subjectKey, asOf || undefined);
  }

  @Get('subjects/:subjectKey/events')
  listEvents(
    @Param('subjectKey', ParseIntPipe) subjectKey: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.listEvents(user, subjectKey);
  }

  /** Explicitly un-cover a topic (removes it from the user's events for the subject). */
  @Delete('subjects/:subjectKey/topics/:topicId/coverage')
  uncoverTopic(
    @Param('subjectKey', ParseIntPipe) subjectKey: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.uncoverTopic(user, subjectKey, topicId);
  }

  @Post('events')
  createEvent(
    @Body() dto: CreateCoverageEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.createEvent(user, dto);
  }

  @Get('events/:id')
  getEvent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.getEvent(user, id);
  }

  @Patch('events/:id')
  updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCoverageEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.updateEvent(user, id, dto);
  }

  @Delete('events/:id')
  deleteEvent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.deleteEvent(user, id);
  }
}
