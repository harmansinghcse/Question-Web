import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter)
    private readonly repository: Repository<Chapter>,
  ) {}

  async findAll(subjectKey?: number): Promise<Chapter[]> {
    const query = this.repository.createQueryBuilder('chapter');

    if (subjectKey !== undefined) {
      query.where('chapter.subjectKey = :subjectKey', { subjectKey });
    }

    return query
      .orderBy('chapter.subjectKey', 'ASC')
      .addOrderBy('chapter.chapterNo', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Chapter> {
    const chapter = await this.repository.findOneBy({ chapterId: id });

    if (!chapter) {
      throw new NotFoundException(`Chapter ${id} not found`);
    }

    return chapter;
  }

  async create(data: Partial<Chapter>): Promise<Chapter> {
    try {
      const chapter = this.repository.create(data);
      return await this.repository.save(chapter);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: number, data: Partial<Chapter>): Promise<Chapter> {
    const chapter = await this.findOne(id);

    Object.assign(chapter, data, { chapterId: id });

    try {
      return await this.repository.save(chapter);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const chapter = await this.findOne(id);
    await this.repository.remove(chapter);

    return { message: 'Chapter deleted successfully' };
  }

  private handleDatabaseError(error: unknown): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'This chapter number already exists for this subject',
        );
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new ConflictException('The specified subject does not exist');
      }
    }

    throw error;
  }
}
