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
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { Subject } from './entities/subject.entity';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { parseStudentEmail } from '../common/student-profile.util';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query('search') search?: string,
    @Query('semester') semester?: string,
    @Query('deptId') deptId?: string,
    @Query('mySemester') mySemester?: string,
    @CurrentUser('email') currentUserEmail?: string,
  ) {
    let resolvedSemester = semester ? parseInt(semester, 10) : undefined;
    let resolvedDeptId = deptId ? parseInt(deptId, 10) : undefined;
    let resolvedDeptCode: string | undefined;

    // When personalized semester filtering is requested, derive student identity
    // securely from the authenticated token payload — never trust client-spoofed params.
    if (mySemester === 'true' && currentUserEmail) {
      const profile = parseStudentEmail(currentUserEmail);
      if (profile) {
        resolvedSemester = profile.currentSemester;
        resolvedDeptCode = profile.deptCode;
        if (profile.deptId) {
          resolvedDeptId = profile.deptId;
        }
      }
    }

    return this.subjectsService.findAll({
      search,
      semester: resolvedSemester,
      deptId: resolvedDeptId,
      deptCode: resolvedDeptCode,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Subject>) {
    return this.subjectsService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Subject>,
  ) {
    return this.subjectsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.remove(id);
  }
}
