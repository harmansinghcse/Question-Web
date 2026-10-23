import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Topic } from '../topics/entities/topic.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Question } from './entities/question.entity';
import { QuestionTopic } from './entities/question-topic.entity';

export interface CreatedQuestion {
  quesId: number;
  quesText: string;
  quesType: string;
  sourceId: number;
  topicIds: number[];
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Creates a Question and its QuestionTopic rows in ONE transaction.
   * Any failure rolls back the question and every topic link.
   */
  async create(dto: CreateQuestionDto): Promise<CreatedQuestion> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const sources: unknown[] = await manager.query(
          'SELECT `SourceID` FROM `Source` WHERE `SourceID` = ?',
          [dto.sourceId],
        );
        if (sources.length === 0) {
          throw new BadRequestException(
            `Source with ID ${dto.sourceId} does not exist`,
          );
        }

        const existing = await manager.find(Topic, {
          select: { topicId: true },
          where: { topicId: In(dto.topicIds) },
        });
        const existingIds = new Set(existing.map((t) => t.topicId));
        const missing = dto.topicIds.filter((id) => !existingIds.has(id));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Topic ID(s) do not exist: ${missing.join(', ')}`,
          );
        }

        const inserted = await manager.insert(Question, {
          quesText: dto.quesText,
          quesType: dto.quesType,
          sourceId: dto.sourceId,
        });
        const quesId = Number((inserted.identifiers[0] as Question).quesId);

        await manager.insert(
          QuestionTopic,
          dto.topicIds.map((topicId) => ({ quesId, topicId })),
        );

        return {
          quesId,
          quesText: dto.quesText,
          quesType: dto.quesType,
          sourceId: dto.sourceId,
          topicIds: dto.topicIds,
        };
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;

      // Foreign-key backstop (e.g. a row deleted between check and insert).
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'ER_NO_REFERENCED_ROW_2' ||
          error.code === 'ER_NO_REFERENCED_ROW')
      ) {
        throw new BadRequestException(
          'Source or topic reference is invalid; nothing was saved',
        );
      }

      this.logger.error(
        'Failed to create question',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to save the question; nothing was saved',
      );
    }
  }
}
