import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UpcomingExamsService } from './upcoming-exams.service';
import { CreateUpcomingExamDto } from './dto/create-upcoming-exam.dto';
import { UpdateUpcomingExamDto } from './dto/update-upcoming-exam.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole } from '../users/entities/user.entity';
import { DepartmentsService } from '../departments/departments.service';
import { parseStudentEmail } from '../common/student-profile.util';

@Controller('upcoming-exams')
@UseGuards(OptionalJwtAuthGuard)
export class UpcomingExamsController {
  constructor(
    private readonly examsService: UpcomingExamsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  async findAll(
    @Query('deptId') deptId?: string,
    @Query('semester') semester?: string,
    @Query('subjectKey') subjectKey?: string,
    @CurrentUser() user?: SafeUser | null,
    @Req() req?: Request,
  ) {
    // A bearer token was sent but is invalid/expired: answer 401 so clients
    // refresh their session instead of silently receiving unscoped data.
    if (!user && req?.headers?.authorization) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    let resolvedDeptId = deptId ? parseInt(deptId, 10) : undefined;
    let resolvedSemester = semester ? parseInt(semester, 10) : undefined;

    // Strict department isolation: logged-in students can ONLY read their own
    // department's exams. Department and semester come from the email, never
    // from client-supplied query parameters.
    if (user && user.role === UserRole.STUDENT) {
      const studentDept = await this.departmentsService.resolveFromEmail(
        user.email,
      );
      if (!studentDept) {
        throw new ForbiddenException(
          'Could not determine your department from institutional email',
        );
      }
      resolvedDeptId = studentDept.deptId;
      const profile = parseStudentEmail(user.email);
      resolvedSemester = profile ? profile.currentSemester : undefined;
    }

    return this.examsService.findUpcoming({
      deptId: resolvedDeptId,
      semester: resolvedSemester,
      subjectKey: subjectKey ? parseInt(subjectKey, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser | null,
  ) {
    const exam = await this.examsService.findOne(id);
    if (user && user.role === UserRole.STUDENT) {
      const studentDept = await this.departmentsService.resolveFromEmail(
        user.email,
      );
      if (studentDept && exam.deptId !== studentDept.deptId) {
        throw new ForbiddenException(
          'Access to exams from other departments is restricted',
        );
      }
    }
    return exam;
  }

  @Post()
  async create(
    @Body() dto: CreateUpcomingExamDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can schedule upcoming exams',
      );
    }
    return this.examsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUpcomingExamDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can update upcoming exams',
      );
    }
    return this.examsService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can delete upcoming exams',
      );
    }
    return this.examsService.remove(id);
  }
}
