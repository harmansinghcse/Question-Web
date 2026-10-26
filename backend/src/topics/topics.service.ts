import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly repository: Repository<Topic>,
  ) {}

  async findAll(chapterId?: number): Promise<Topic[]> {
    const query = this.repository.createQueryBuilder('topic');

    if (chapterId !== undefined) {
      query.where('topic.chapterId = :chapterId', { chapterId });
    }

    return query.orderBy('topic.topicName', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Topic> {
    const topic = await this.repository.findOneBy({ topicId: id });

    if (!topic) {
      throw new NotFoundException(`Topic ${id} not found`);
    }

    return topic;
  }

  async create(data: Partial<Topic>): Promise<Topic> {
    if (!data.topicName?.trim() || data.chapterId == null) {
      throw new BadRequestException('topicName and chapterId are required');
    }

    try {
      const topic = this.repository.create({
        topicName: data.topicName.trim(),
        chapterId: data.chapterId,
      });

      return await this.repository.save(topic);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: number, data: Partial<Topic>): Promise<Topic> {
    const topic = await this.findOne(id);

    if (data.topicName !== undefined) {
      if (!data.topicName.trim()) {
        throw new BadRequestException('topicName cannot be empty');
      }
      topic.topicName = data.topicName.trim();
    }

    if (data.chapterId !== undefined) {
      topic.chapterId = data.chapterId;
    }

    try {
      return await this.repository.save(topic);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const topic = await this.findOne(id);
    await this.repository.remove(topic);

    return { message: 'Topic deleted successfully' };
  }

  private handleDatabaseError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_NO_REFERENCED_ROW_2'
    ) {
      throw new BadRequestException('The specified chapter does not exist');
    }

    throw error;
  }
}
