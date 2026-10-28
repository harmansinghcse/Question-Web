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
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TimetablesService } from './timetables.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole } from '../users/entities/user.entity';
import { DepartmentsService } from '../departments/departments.service';
import { parseStudentEmail } from '../common/student-profile.util';

@Controller('timetables')
@UseGuards(OptionalJwtAuthGuard)
export class TimetablesController {
  constructor(
    private readonly timetablesService: TimetablesService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get('my')
  async getMyTimetable(
    @Query('division') division?: string,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (!user)
      throw new UnauthorizedException(
        'Please log in to view your personal timetable.',
      );

    const studentDept = await this.departmentsService.resolveFromEmail(
      user.email,
    );
    if (!studentDept) {
      throw new NotFoundException(
        'Could not determine your department from institutional email',
      );
    }

    const profile = parseStudentEmail(user.email);
    if (!profile) {
      throw new NotFoundException(
        'Could not determine your semester from institutional email',
      );
    }

    // Department and semester always come from the authenticated user's email.
    // Only the division (a view filter, not an authorization input) is client-supplied.
    const result = await this.timetablesService.findStudentSchedule({
      deptId: studentDept.deptId,
      semester: profile.currentSemester,
      division,
    });

    return {
      deptId: studentDept.deptId,
      deptName: studentDept.deptName,
      semester: profile.currentSemester,
      divisions: result.divisions,
      division: result.division,
      timetable: result.timetable,
    };
  }

  @Get()
  async findAll(
    @Query('deptId') deptId?: string,
    @Query('semester') semester?: string,
    @Query('academicYear') academicYear?: string,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role === UserRole.STUDENT) {
      const studentDept = await this.departmentsService.resolveFromEmail(
        user.email,
      );
      const profile = parseStudentEmail(user.email);
      return this.timetablesService.findAll({
        deptId: studentDept?.deptId,
        semester: profile?.currentSemester,
        academicYear,
      });
    }

    return this.timetablesService.findAll({
      deptId: deptId ? parseInt(deptId, 10) : undefined,
      semester: semester ? parseInt(semester, 10) : undefined,
      academicYear,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser | null,
  ) {
    const tt = await this.timetablesService.findOne(id);
    if (user && user.role === UserRole.STUDENT) {
      const studentDept = await this.departmentsService.resolveFromEmail(
        user.email,
      );
      if (studentDept && tt.deptId !== studentDept.deptId) {
        throw new ForbiddenException(
          'Access to other department timetables is restricted',
        );
      }
    }
    return tt;
  }

  @Post()
  async create(
    @Body() dto: CreateTimetableDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can create timetables');
    }
    return this.timetablesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimetableDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can update timetables');
    }
    return this.timetablesService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete timetables');
    }
    return this.timetablesService.remove(id);
  }

  @Post(':id/entries')
  async addEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTimetableEntryDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can add timetable entries',
      );
    }
    return this.timetablesService.addEntry(id, dto);
  }

  @Patch(':id/entries/:entryId')
  async updateEntry(
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateTimetableEntryDto,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can modify timetable entries',
      );
    }
    return this.timetablesService.updateEntry(id, entryId, dto);
  }

  @Delete(':id/entries/:entryId')
  async removeEntry(
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @CurrentUser() user?: SafeUser | null,
  ) {
    if (user && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can delete timetable entries',
      );
    }
    return this.timetablesService.removeEntry(id, entryId);
  }
}
