import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timetable } from './entities/timetable.entity';
import { TimetableEntry } from './entities/timetable-entry.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { UpdateTimetableDto } from './dto/update-timetable.dto';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';

@Injectable()
export class TimetablesService {
  constructor(
    @InjectRepository(Timetable)
    private readonly timetableRepo: Repository<Timetable>,
    @InjectRepository(TimetableEntry)
    private readonly entryRepo: Repository<TimetableEntry>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  /**
   * Finds the currently active timetable for a student's department, semester, and division.
   */
  async findStudentTimetable(params: {
    deptId: number;
    semester: number;
    division?: string;
  }): Promise<Timetable | null> {
    const qb = this.timetableRepo
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.department', 'dept')
      .leftJoinAndSelect('tt.entries', 'entry')
      .leftJoinAndSelect('entry.subject', 'sub')
      .where('tt.deptId = :deptId', { deptId: params.deptId })
      .andWhere('tt.semester = :semester', { semester: params.semester })
      .andWhere('tt.isActive = true');

    if (params.division) {
      qb.andWhere('tt.division = :div', {
        div: params.division.trim().toUpperCase(),
      });
    }

    return qb
      .orderBy('entry.dayOfWeek', 'ASC')
      .addOrderBy('entry.startTime', 'ASC')
      .getOne();
  }

  /**
   * Resolves the student's timetable for their department + semester.
   * Only active timetables of the most recent academic year are considered.
   * The division is never guessed: it is used only when requested explicitly
   * or when exactly one division exists for the scope.
   */
  async findStudentSchedule(params: {
    deptId: number;
    semester: number;
    division?: string;
  }): Promise<{
    divisions: string[];
    division: string | null;
    timetable: Timetable | null;
  }> {
    const candidates = await this.timetableRepo.find({
      where: {
        deptId: params.deptId,
        semester: params.semester,
        isActive: true,
      },
      order: { academicYear: 'DESC', timetableId: 'DESC' },
    });

    const latestYear = candidates[0]?.academicYear;
    const current = candidates.filter((c) => c.academicYear === latestYear);
    const divisions = [...new Set(current.map((c) => c.division))].sort();

    const requested = params.division?.trim().toUpperCase();
    let division: string | null = null;
    if (requested) {
      division = divisions.includes(requested) ? requested : null;
    } else if (divisions.length === 1) {
      division = divisions[0];
    }

    const match = division
      ? current.find((c) => c.division === division)
      : undefined;
    const timetable = match ? await this.findOne(match.timetableId) : null;

    return { divisions, division, timetable };
  }

  async findAll(query?: {
    deptId?: number;
    semester?: number;
    academicYear?: string;
  }): Promise<Timetable[]> {
    const qb = this.timetableRepo
      .createQueryBuilder('tt')
      .leftJoinAndSelect('tt.department', 'dept')
      .leftJoinAndSelect('tt.entries', 'entry')
      .leftJoinAndSelect('entry.subject', 'sub');

    if (query?.deptId) {
      qb.andWhere('tt.deptId = :deptId', { deptId: query.deptId });
    }
    if (query?.semester) {
      qb.andWhere('tt.semester = :semester', { semester: query.semester });
    }
    if (query?.academicYear) {
      qb.andWhere('tt.academicYear = :year', { year: query.academicYear });
    }

    return qb
      .orderBy('tt.semester', 'ASC')
      .addOrderBy('tt.division', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Timetable> {
    const tt = await this.timetableRepo.findOne({
      where: { timetableId: id },
      relations: { department: true, entries: { subject: true } },
      order: {
        entries: {
          dayOfWeek: 'ASC',
          startTime: 'ASC',
        },
      },
    });
    if (!tt) {
      throw new NotFoundException(`Timetable #${id} not found`);
    }
    return tt;
  }

  async create(dto: CreateTimetableDto): Promise<Timetable> {
    const normalizedDiv = dto.division.trim().toUpperCase();
    if (dto.isActive) {
      const existingActive = await this.timetableRepo.findOne({
        where: {
          deptId: dto.deptId,
          semester: dto.semester,
          division: normalizedDiv,
          academicYear: dto.academicYear.trim(),
          isActive: true,
        },
      });
      if (existingActive) {
        throw new ConflictException(
          `An active timetable already exists for this department, semester, division, and academic year (#${existingActive.timetableId})`,
        );
      }
    }

    const timetable = this.timetableRepo.create({
      ...dto,
      division: normalizedDiv,
      academicYear: dto.academicYear.trim(),
      isActive: dto.isActive ?? true,
    });
    return this.timetableRepo.save(timetable);
  }

  async update(id: number, dto: UpdateTimetableDto): Promise<Timetable> {
    const tt = await this.findOne(id);
    const targetDiv = dto.division
      ? dto.division.trim().toUpperCase()
      : tt.division;
    const targetYear = dto.academicYear
      ? dto.academicYear.trim()
      : tt.academicYear;
    const targetDept = dto.deptId ?? tt.deptId;
    const targetSem = dto.semester ?? tt.semester;
    const targetActive =
      dto.isActive !== undefined ? dto.isActive : tt.isActive;

    if (targetActive) {
      const existing = await this.timetableRepo.findOne({
        where: {
          deptId: targetDept,
          semester: targetSem,
          division: targetDiv,
          academicYear: targetYear,
          isActive: true,
        },
      });
      if (existing && existing.timetableId !== id) {
        throw new ConflictException(
          `Another active timetable already exists for this configuration (#${existing.timetableId})`,
        );
      }
    }

    Object.assign(tt, {
      ...dto,
      division: targetDiv,
      academicYear: targetYear,
      deptId: targetDept,
      semester: targetSem,
      isActive: targetActive,
    });
    return this.timetableRepo.save(tt);
  }

  async remove(id: number): Promise<{ message: string }> {
    const tt = await this.findOne(id);
    await this.timetableRepo.remove(tt);
    return { message: `Timetable #${id} deleted successfully` };
  }

  // ================= TIMETABLE ENTRIES =================

  async addEntry(
    timetableId: number,
    dto: CreateTimetableEntryDto,
  ): Promise<TimetableEntry> {
    const timetable = await this.findOne(timetableId);

    this.validateTimeOrder(dto.startTime, dto.endTime);

    const subject = await this.subjectRepo.findOneBy({
      subjectKey: dto.subjectKey,
    });
    if (!subject) {
      throw new NotFoundException(`Subject #${dto.subjectKey} does not exist`);
    }

    await this.checkOverlap(
      timetableId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );

    const entry = this.entryRepo.create({
      ...dto,
      timetableId: timetable.timetableId,
    });
    return this.entryRepo.save(entry);
  }

  async updateEntry(
    timetableId: number,
    entryId: number,
    dto: UpdateTimetableEntryDto,
  ): Promise<TimetableEntry> {
    await this.findOne(timetableId);
    const entry = await this.entryRepo.findOne({
      where: { entryId, timetableId },
    });
    if (!entry) {
      throw new NotFoundException(`Timetable entry #${entryId} not found`);
    }

    const start = dto.startTime ?? entry.startTime;
    const end = dto.endTime ?? entry.endTime;
    const day = dto.dayOfWeek ?? entry.dayOfWeek;

    this.validateTimeOrder(start, end);

    if (dto.subjectKey) {
      const subject = await this.subjectRepo.findOneBy({
        subjectKey: dto.subjectKey,
      });
      if (!subject) {
        throw new NotFoundException(
          `Subject #${dto.subjectKey} does not exist`,
        );
      }
    }

    await this.checkOverlap(timetableId, day, start, end, entryId);

    Object.assign(entry, dto);
    return this.entryRepo.save(entry);
  }

  async removeEntry(
    timetableId: number,
    entryId: number,
  ): Promise<{ message: string }> {
    const entry = await this.entryRepo.findOne({
      where: { entryId, timetableId },
    });
    if (!entry) {
      throw new NotFoundException(`Timetable entry #${entryId} not found`);
    }
    await this.entryRepo.remove(entry);
    return { message: `Timetable entry #${entryId} removed successfully` };
  }

  private validateTimeOrder(start: string, end: string): void {
    if (start >= end) {
      throw new BadRequestException(
        `startTime (${start}) must be before endTime (${end})`,
      );
    }
  }

  private async checkOverlap(
    timetableId: number,
    day: string,
    start: string,
    end: string,
    excludeEntryId?: number,
  ): Promise<void> {
    const qb = this.entryRepo
      .createQueryBuilder('e')
      .where('e.timetableId = :timetableId', { timetableId })
      .andWhere('e.dayOfWeek = :day', { day })
      .andWhere('e.startTime < :end AND e.endTime > :start', { start, end });

    if (excludeEntryId) {
      qb.andWhere('e.entryId != :excludeEntryId', { excludeEntryId });
    }

    const overlap = await qb.getOne();
    if (overlap) {
      throw new ConflictException(
        `Time slot conflict: overlapping entry exists on ${day} (${overlap.startTime} - ${overlap.endTime})`,
      );
    }
  }
}
