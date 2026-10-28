import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UpcomingExam } from './entities/upcoming-exam.entity';
import { CreateUpcomingExamDto } from './dto/create-upcoming-exam.dto';
import { UpdateUpcomingExamDto } from './dto/update-upcoming-exam.dto';

export interface ExamQueryOptions {
  deptId?: number;
  semester?: number;
  subjectKey?: number;
}

@Injectable()
export class UpcomingExamsService {
  private readonly logger = new Logger(UpcomingExamsService.name);

  constructor(
    @InjectRepository(UpcomingExam)
    private readonly examRepo: Repository<UpcomingExam>,
  ) {}

  /**
   * Retrieves active, non-expired upcoming exams matching the requested filters.
   * Instant read-time filtering guarantees expired exams are never returned.
   */
  async findUpcoming(options: ExamQueryOptions): Promise<UpcomingExam[]> {
    const qb = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.department', 'dept')
      .leftJoinAndSelect('exam.subject', 'sub')
      .where('exam.examDate >= :now', { now: new Date() });

    if (options.deptId !== undefined && !Number.isNaN(options.deptId)) {
      qb.andWhere('exam.deptId = :deptId', { deptId: options.deptId });
    }

    if (options.semester !== undefined && !Number.isNaN(options.semester)) {
      // Exams with no semester/subject semester are department-wide.
      qb.andWhere(
        '(exam.semester = :semester OR sub.semester = :semester OR (exam.semester IS NULL AND sub.semester IS NULL))',
        {
        semester: options.semester,
      });
    }

    if (options.subjectKey !== undefined && !Number.isNaN(options.subjectKey)) {
      qb.andWhere('exam.subjectKey = :subjectKey', {
        subjectKey: options.subjectKey,
      });
    }

    return qb.orderBy('exam.examDate', 'ASC').getMany();
  }

  async findOne(id: number): Promise<UpcomingExam> {
    const exam = await this.examRepo.findOne({
      where: { examId: id },
      relations: { department: true, subject: true },
    });
    if (!exam) {
      throw new NotFoundException(`Upcoming exam #${id} not found`);
    }
    return exam;
  }

  async create(dto: CreateUpcomingExamDto): Promise<UpcomingExam> {
    const exam = this.examRepo.create({
      ...dto,
      examDate: new Date(dto.examDate),
    });
    return this.examRepo.save(exam);
  }

  async update(id: number, dto: UpdateUpcomingExamDto): Promise<UpcomingExam> {
    const exam = await this.findOne(id);
    if (dto.examDate) {
      exam.examDate = new Date(dto.examDate);
    }
    Object.assign(exam, {
      ...dto,
      examDate: dto.examDate ? new Date(dto.examDate) : exam.examDate,
    });
    return this.examRepo.save(exam);
  }

  async remove(id: number): Promise<{ message: string }> {
    const exam = await this.findOne(id);
    await this.examRepo.remove(exam);
    return { message: `Upcoming exam #${id} deleted successfully` };
  }

  /**
   * Automated hourly database cleanup: purges past exams from MySQL.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredExams(): Promise<void> {
    try {
      const result = await this.examRepo.delete({
        examDate: LessThan(new Date()),
      });
      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Purged ${result.affected} expired upcoming exam(s) from database.`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        'Error during scheduled exam cleanup',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
