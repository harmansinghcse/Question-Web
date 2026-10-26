import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';

export interface SubjectFilterOptions {
  search?: string;
  semester?: number;
  deptId?: number;
  deptCode?: string;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly repository: Repository<Subject>,
  ) {}

  async findAll(options?: string | SubjectFilterOptions): Promise<Subject[]> {
    const opts: SubjectFilterOptions =
      typeof options === 'string' ? { search: options } : options || {};

    const query = this.repository.createQueryBuilder('subject');

    if (opts.search?.trim()) {
      query.andWhere(
        '(subject.subjectName LIKE :search OR subject.subjectId LIKE :search)',
        { search: `%${opts.search.trim()}%` },
      );
    }

    if (opts.semester !== undefined && !Number.isNaN(opts.semester)) {
      query.andWhere('subject.semester = :semester', {
        semester: opts.semester,
      });
    }

    if (opts.deptId !== undefined && !Number.isNaN(opts.deptId)) {
      if (opts.deptCode) {
        // Match either department ID or subjectId prefix (e.g. CS101)
        query.andWhere(
          '(subject.deptId = :deptId OR subject.subjectId LIKE :deptPrefix)',
          {
            deptId: opts.deptId,
            deptPrefix: `${opts.deptCode.toUpperCase()}%`,
          },
        );
      } else {
        query.andWhere('subject.deptId = :deptId', { deptId: opts.deptId });
      }
    } else if (opts.deptCode) {
      query.andWhere('subject.subjectId LIKE :deptPrefix', {
        deptPrefix: `${opts.deptCode.toUpperCase()}%`,
      });
    }

    return query
      .orderBy('subject.semester', 'ASC')
      .addOrderBy('subject.subjectName', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Subject> {
    const subject = await this.repository.findOneBy({
      subjectKey: id,
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    return subject;
  }

  async create(data: Partial<Subject>): Promise<Subject> {
    try {
      const subject = this.repository.create(data);
      return await this.repository.save(subject);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: number, data: Partial<Subject>): Promise<Subject> {
    const subject = await this.findOne(id);

    Object.assign(subject, data);
    subject.subjectKey = id;

    try {
      return await this.repository.save(subject);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const subject = await this.findOne(id);

    await this.repository.remove(subject);

    return {
      message: 'Subject deleted successfully',
    };
  }

  private handleDatabaseError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException(
        'This subject code already exists in the department',
      );
    }

    throw error;
  }
}
