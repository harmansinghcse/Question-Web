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
  Inject,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { Subject } from './entities/subject.entity';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole } from '../users/entities/user.entity';
import { parseStudentEmail } from '../common/student-profile.util';
import { DepartmentsService } from '../departments/departments.service';

@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    @Inject(DepartmentsService)
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query('search') search?: string,
    @Query('semester') semester?: string,
    @Query('deptId') deptId?: string,
    @Query('mySemester') mySemester?: string,
    @CurrentUser() currentUser?: SafeUser | null,
  ) {
    let resolvedSemester = semester ? parseInt(semester, 10) : undefined;
    let resolvedDeptId = deptId ? parseInt(deptId, 10) : undefined;
    let resolvedDeptCode: string | undefined;

    // Server-side department isolation for authenticated students
    if (currentUser && currentUser.email) {
      if (currentUser.role === UserRole.STUDENT) {
        const studentDept = await this.departmentsService.resolveFromEmail(
          currentUser.email,
        );
        if (studentDept) {
          resolvedDeptId = studentDept.deptId;
        }
      }

      const profile = parseStudentEmail(currentUser.email);
      if (profile) {
        resolvedDeptCode = profile.deptCode;
        if (
          mySemester === 'true' ||
          (currentUser.role === UserRole.STUDENT && !semester)
        ) {
          resolvedSemester = profile.currentSemester;
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
