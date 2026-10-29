import { Entity, PrimaryColumn, Index } from 'typeorm';

/** Topic taught in a CoverageEvent. Unique per (event, topic). */
@Entity({ name: 'CoverageEventTopic' })
export class CoverageEventTopic {
  @PrimaryColumn({ name: 'eventId', type: 'int' })
  eventId: number;

  @Index('IDX_CoverageEventTopic_topicId')
  @PrimaryColumn({ name: 'topicId', type: 'int' })
  topicId: number;
}

