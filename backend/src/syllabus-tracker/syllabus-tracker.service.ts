import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Subject } from '../subjects/entities/subject.entity';
import { DepartmentsService } from '../departments/departments.service';
import { parseStudentEmail } from '../common/student-profile.util';
import { UserRole } from '../users/entities/user.entity';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';
import { CoverageEvent } from './entities/coverage-event.entity';
import { CoverageEventTopic } from './entities/coverage-event-topic.entity';
import {
  CreateCoverageEventDto,
  UpdateCoverageEventDto,
} from './dto/coverage-event.dto';
import {
  assertCoverageDate,
  buildTree,
  buildWeeklyActivity,
  formatUtcDate,
  RawEventTopicActivityRow,
  TreeRow,
} from './syllabus-tracker.util';

export interface CoverageEventTopicView {
  topicId: number;
  topicName: string;
  chapterId: number;
  chapterNo: number;
  chapterName: string;
}

export interface CoverageEventView {
  eventId: number;
  subjectKey: number;
  coverageDate: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  topics: CoverageEventTopicView[];
}

export interface TrackerSubjectOverview {
  subjectKey: number;
  subjectId: string;
  deptId: number;
  subjectName: string | null;
  credits: number;
  semester: number;
  totalChapters: number;
  totalTopics: number;
  coveredTopics: number;
  coveragePercent: number;
  eventCount: number;
  lastCoverageDate: string | null;
}

interface EventRow {
  eventId: number | string;
  subjectKey: number | string;
  coverageDate: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EventTopicRow {
  eventId: number | string;
  topicId: number | string;
  topicName: string;
  chapterId: number | string;
  chapterNo: number | string;
  chapterName: string;
}

@Injectable()
export class SyllabusTrackerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly departmentsService: DepartmentsService,
  ) {}

  // ---------------------------------------------------------------- access

  /**
   * Subject must exist and, for students, belong to the department resolved
   * from the authenticated email (never from client input).
   */
  private async assertSubjectAccess(
    user: SafeUser,
    subjectKey: number,
  ): Promise<Subject> {
    const subject = await this.subjectRepo.findOneBy({ subjectKey });
    if (!subject) {
      throw new NotFoundException(`Subject ${subjectKey} not found`);
    }
    if (user.role === UserRole.STUDENT) {
      const dept = await this.departmentsService.resolveFromEmail(user.email);
      if (!dept || dept.deptId !== subject.deptId) {
        throw new ForbiddenException(
          'This subject is not part of your department',
        );
      }
    }
    return subject;
  }

  /** Normalises topic ids and verifies each belongs to the subject. */
  private async assertTopicsBelongToSubject(
    manager: EntityManager,
    subjectKey: number,
    topicIds: number[],
  ): Promise<number[]> {
    const unique = [...new Set(topicIds)];
    const rows: { topicId: number | string }[] = await manager.query(
      `SELECT t.topicId AS topicId
         FROM Topic t
         JOIN Chapter c ON c.chapterId = t.chapterId
        WHERE c.subjectKey = ? AND t.topicId IN (?)`,
      [subjectKey, unique],
    );
    const valid = new Set(rows.map((r) => Number(r.topicId)));
    const invalid = unique.filter((id) => !valid.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Topic(s) ${invalid.join(', ')} do not belong to subject ${subjectKey}`,
      );
    }
    return unique;
  }

  private cleanNotes(notes?: string): string | null {
    const trimmed = notes?.trim();
    return trimmed ? trimmed : null;
  }

  // ------------------------------------------------------------------ read

  /**
   * Resolves the authenticated user's academic context and available subjects
   * along with live per-subject unique-topic coverage counts.
   */
  async getContext(user: SafeUser) {
    const profile = parseStudentEmail(user.email);
    const dept = await this.departmentsService.resolveFromEmail(user.email);

    if (user.role === UserRole.STUDENT && !dept) {
      throw new ForbiddenException(
        'Could not resolve your department from your institutional email',
      );
    }

    const params: unknown[] = [user.userId];
    let deptWhere = '';
    if (user.role === UserRole.STUDENT && dept) {
      deptWhere = ' WHERE s.deptId = ?';
      params.push(dept.deptId);
    }

    const subjectRows: {
      subjectKey: number | string;
      subjectId: string;
      deptId: number | string;
      subjectName: string | null;
      credits: number | string;
      semester: number | string;
      totalChapters: number | string;
      totalTopics: number | string;
      coveredTopics: number | string;
      eventCount: number | string;
      lastCoverageDate: string | null;
    }[] = await this.dataSource.query(
      `SELECT s.subjectKey,
              s.subjectId,
              s.deptId,
              s.subjectName,
              s.credits,
              s.semester,
              COUNT(DISTINCT c.chapterId) AS totalChapters,
              COUNT(DISTINCT t.topicId) AS totalTopics,
              COUNT(DISTINCT CASE WHEN e.eventId IS NOT NULL THEN t.topicId END) AS coveredTopics,
              COUNT(DISTINCT e.eventId) AS eventCount,
              DATE_FORMAT(MAX(e.coverageDate), '%Y-%m-%d') AS lastCoverageDate
         FROM Subject s
         LEFT JOIN Chapter c ON c.subjectKey = s.subjectKey
         LEFT JOIN Topic t ON t.chapterId = c.chapterId
         LEFT JOIN CoverageEventTopic et ON et.topicId = t.topicId
         LEFT JOIN CoverageEvent e ON e.eventId = et.eventId
                                  AND e.userId = ?
                                  AND e.subjectKey = s.subjectKey
       ${deptWhere}
        GROUP BY s.subjectKey, s.subjectId, s.deptId, s.subjectName, s.credits, s.semester
        ORDER BY s.semester ASC, s.subjectId ASC, s.subjectName ASC`,
      params,
    );

    const subjects: TrackerSubjectOverview[] = subjectRows.map((r) => {
      const totalTopics = Number(r.totalTopics ?? 0);
      const coveredTopics = Number(r.coveredTopics ?? 0);
      return {
        subjectKey: Number(r.subjectKey),
        subjectId: r.subjectId,
        deptId: Number(r.deptId),
        subjectName: r.subjectName,
        credits: Number(r.credits ?? 0),
        semester: Number(r.semester ?? 1),
        totalChapters: Number(r.totalChapters ?? 0),
        totalTopics,
        coveredTopics,
        coveragePercent:
          totalTopics > 0
            ? Math.round((coveredTopics / totalTopics) * 1000) / 10
            : 0,
        eventCount: Number(r.eventCount ?? 0),
        lastCoverageDate: r.lastCoverageDate ?? null,
      };
    });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      academicContext: {
        deptId: dept?.deptId ?? null,
        deptName: dept?.deptName ?? null,
        deptCode: profile?.deptCode ?? null,
        currentSemester: profile?.currentSemester ?? null,
        academicYearLabel: profile?.academicYearLabel ?? null,
        admissionYear: profile?.admissionYear ?? null,
        rollNumber: profile?.rollNumber ?? null,
      },
      subjects,
    };
  }

  /**
   * Per-subject unique-topic coverage summary for the authenticated user.
   */
  async getSummary(
    user: SafeUser,
  ): Promise<
    {
      subjectKey: number;
      totalTopics: number;
      coveredTopics: number;
      coveragePercent: number;
    }[]
  > {
    let deptFilter = '';
    const params: unknown[] = [user.userId];
    if (user.role === UserRole.STUDENT) {
      const dept = await this.departmentsService.resolveFromEmail(user.email);
      if (!dept) return [];
      deptFilter = ' WHERE s.deptId = ?';
      params.push(dept.deptId);
    }

    const rows: {
      subjectKey: number | string;
      totalTopics: number | string;
      coveredTopics: number | string;
    }[] = await this.dataSource.query(
      `SELECT s.subjectKey AS subjectKey,
              COUNT(DISTINCT t.topicId) AS totalTopics,
              COUNT(DISTINCT CASE WHEN e.userId IS NOT NULL THEN t.topicId END) AS coveredTopics
         FROM Subject s
         LEFT JOIN Chapter c ON c.subjectKey = s.subjectKey
         LEFT JOIN Topic t ON t.chapterId = c.chapterId
         LEFT JOIN CoverageEventTopic et ON et.topicId = t.topicId
         LEFT JOIN CoverageEvent e ON e.eventId = et.eventId AND e.userId = ? AND e.subjectKey = s.subjectKey
       ${deptFilter}
        GROUP BY s.subjectKey`,
      params,
    );

    return rows.map((r) => {
      const totalTopics = Number(r.totalTopics ?? 0);
      const coveredTopics = Number(r.coveredTopics ?? 0);
      return {
        subjectKey: Number(r.subjectKey),
        totalTopics,
        coveredTopics,
        coveragePercent:
          totalTopics > 0
            ? Math.round((coveredTopics / totalTopics) * 1000) / 10
            : 0,
      };
    });
  }

  /**
   * Chapter/topic tree with coverage + weekly activity for the user's events
   * of this subject. When asOf is given, only events with coverageDate <= asOf count.
   */
  async getTree(user: SafeUser, subjectKey: number, asOf?: string) {
    const subject = await this.assertSubjectAccess(user, subjectKey);
    if (asOf !== undefined) {
      assertCoverageDate(asOf, new Date(Date.UTC(2100, 0, 1)));
    }

    const params: unknown[] = [user.userId, subjectKey];
    let dateFilter = '';
    if (asOf) {
      dateFilter = ' AND e.coverageDate <= ?';
      params.push(asOf);
    }
    params.push(subjectKey);

    const rows: TreeRow[] = await this.dataSource.query(
      `SELECT c.chapterId, c.chapterNo, c.chapterName,
              t.topicId, t.topicName,
              DATE_FORMAT(MIN(x.coverageDate), '%Y-%m-%d') AS firstDate,
              DATE_FORMAT(MAX(x.coverageDate), '%Y-%m-%d') AS lastDate,
              COUNT(x.eventId) AS times
         FROM Chapter c
         LEFT JOIN Topic t ON t.chapterId = c.chapterId
         LEFT JOIN (
               SELECT et.topicId, e.eventId, e.coverageDate
                 FROM CoverageEventTopic et
                 JOIN CoverageEvent e ON e.eventId = et.eventId
                WHERE e.userId = ? AND e.subjectKey = ?${dateFilter}
              ) x ON x.topicId = t.topicId
        WHERE c.subjectKey = ?
        GROUP BY c.chapterId, c.chapterNo, c.chapterName, t.topicId, t.topicName
        ORDER BY c.chapterNo ASC, c.chapterId ASC, t.topicId ASC`,
      params,
    );

    const eventStats: {
      eventCount: number | string;
      lastDate: string | null;
    }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS eventCount,
              DATE_FORMAT(MAX(coverageDate), '%Y-%m-%d') AS lastDate
         FROM CoverageEvent
        WHERE userId = ? AND subjectKey = ?${asOf ? ' AND coverageDate <= ?' : ''}`,
      asOf ? [user.userId, subjectKey, asOf] : [user.userId, subjectKey],
    );

    const activityRows: RawEventTopicActivityRow[] = await this.dataSource.query(
      `SELECT e.eventId AS eventId,
              DATE_FORMAT(e.coverageDate, '%Y-%m-%d') AS coverageDate,
              et.topicId AS topicId
         FROM CoverageEvent e
         JOIN CoverageEventTopic et ON et.eventId = e.eventId
        WHERE e.userId = ? AND e.subjectKey = ?${asOf ? ' AND e.coverageDate <= ?' : ''}`,
      asOf ? [user.userId, subjectKey, asOf] : [user.userId, subjectKey],
    );

    const dept = await this.departmentsService.findById(subject.deptId);
    const { chapters, stats } = buildTree(rows);
    const referenceDate = asOf ?? formatUtcDate(new Date());
    const weeklyActivity = buildWeeklyActivity(activityRows ?? [], referenceDate, 6);

    return {
      subjectKey: subject.subjectKey,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      semester: subject.semester,
      credits: subject.credits,
      deptId: subject.deptId,
      deptName: dept?.deptName ?? null,
      asOf: asOf ?? null,
      stats: {
        ...stats,
        eventCount: Number(eventStats[0]?.eventCount ?? 0),
        lastCoverageDate: eventStats[0]?.lastDate ?? null,
      },
      weeklyActivity,
      chapters,
    };
  }

  private async hydrateEvents(
    manager: EntityManager | DataSource,
    events: EventRow[],
  ): Promise<CoverageEventView[]> {
    if (events.length === 0) return [];
    const ids = events.map((e) => Number(e.eventId));
    const topicRows: EventTopicRow[] = await manager.query(
      `SELECT et.eventId, t.topicId, t.topicName,
              c.chapterId, c.chapterNo, c.chapterName
         FROM CoverageEventTopic et
         JOIN Topic t ON t.topicId = et.topicId
         JOIN Chapter c ON c.chapterId = t.chapterId
        WHERE et.eventId IN (?)
        ORDER BY c.chapterNo ASC, t.topicId ASC`,
      [ids],
    );
    const byEvent = new Map<number, CoverageEventTopicView[]>();
    for (const r of topicRows) {
      const key = Number(r.eventId);
      const list = byEvent.get(key) ?? [];
      list.push({
        topicId: Number(r.topicId),
        topicName: r.topicName,
        chapterId: Number(r.chapterId),
        chapterNo: Number(r.chapterNo),
        chapterName: r.chapterName,
      });
      byEvent.set(key, list);
    }
    return events.map((e) => ({
      eventId: Number(e.eventId),
      subjectKey: Number(e.subjectKey),
      coverageDate: e.coverageDate,
      notes: e.notes,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      topics: byEvent.get(Number(e.eventId)) ?? [],
    }));
  }

  /** The user's events for a subject, newest coverage date first. */
  async listEvents(
    user: SafeUser,
    subjectKey: number,
  ): Promise<CoverageEventView[]> {
    await this.assertSubjectAccess(user, subjectKey);
    const events: EventRow[] = await this.dataSource.query(
      `SELECT eventId, subjectKey,
              DATE_FORMAT(coverageDate, '%Y-%m-%d') AS coverageDate,
              notes, createdAt, updatedAt
         FROM CoverageEvent
        WHERE userId = ? AND subjectKey = ?
        ORDER BY coverageDate DESC, eventId DESC`,
      [user.userId, subjectKey],
    );
    return this.hydrateEvents(this.dataSource, events);
  }

  private async loadOwnedEvent(
    manager: EntityManager | DataSource,
    user: SafeUser,
    eventId: number,
  ): Promise<EventRow> {
    const rows: EventRow[] = await manager.query(
      `SELECT eventId, subjectKey,
              DATE_FORMAT(coverageDate, '%Y-%m-%d') AS coverageDate,
              notes, createdAt, updatedAt
         FROM CoverageEvent
        WHERE eventId = ? AND userId = ?`,
      [eventId, user.userId],
    );
    // Same response for "missing" and "someone else's": no existence leak.
    if (rows.length === 0) {
      throw new NotFoundException(`Coverage event ${eventId} not found`);
    }
    return rows[0];
  }

  async getEvent(user: SafeUser, eventId: number): Promise<CoverageEventView> {
    const event = await this.loadOwnedEvent(this.dataSource, user, eventId);
    const [view] = await this.hydrateEvents(this.dataSource, [event]);
    return view;
  }

  // ----------------------------------------------------------------- write

  async createEvent(
    user: SafeUser,
    dto: CreateCoverageEventDto,
  ): Promise<CoverageEventView> {
    const coverageDate = assertCoverageDate(dto.coverageDate);
    await this.assertSubjectAccess(user, dto.subjectKey);

    const eventId = await this.dataSource.transaction(async (manager) => {
      const topicIds = await this.assertTopicsBelongToSubject(
        manager,
        dto.subjectKey,
        dto.topicIds,
      );

      // Reject an exact duplicate (same day, same subject, same topic set),
      // e.g. a double-tapped save.
      const sameDay: { eventId: number | string; ids: string }[] =
        await manager.query(
          `SELECT e.eventId AS eventId,
                  GROUP_CONCAT(et.topicId ORDER BY et.topicId) AS ids
             FROM CoverageEvent e
             JOIN CoverageEventTopic et ON et.eventId = e.eventId
            WHERE e.userId = ? AND e.subjectKey = ? AND e.coverageDate = ?
            GROUP BY e.eventId`,
          [user.userId, dto.subjectKey, coverageDate],
        );
      const signature = [...topicIds].sort((a, b) => a - b).join(',');
      const duplicate = sameDay.find((r) => r.ids === signature);
      if (duplicate) {
        throw new ConflictException(
          `An identical coverage record already exists for ${coverageDate} (event #${Number(duplicate.eventId)})`,
        );
      }

      const inserted = await manager.insert(CoverageEvent, {
        userId: user.userId,
        subjectKey: dto.subjectKey,
        coverageDate,
        notes: this.cleanNotes(dto.notes),
      });
      const newId = Number((inserted.identifiers[0] as CoverageEvent).eventId);
      await manager.insert(
        CoverageEventTopic,
        topicIds.map((topicId) => ({ eventId: newId, topicId })),
      );
      return newId;
    });

    return this.getEvent(user, eventId);
  }

  async updateEvent(
    user: SafeUser,
    eventId: number,
    dto: UpdateCoverageEventDto,
  ): Promise<CoverageEventView> {
    const newDate =
      dto.coverageDate !== undefined
        ? assertCoverageDate(dto.coverageDate)
        : undefined;

    await this.dataSource.transaction(async (manager) => {
      const event = await this.loadOwnedEvent(manager, user, eventId);
      const subjectKey = Number(event.subjectKey);
      await this.assertSubjectAccess(user, subjectKey);

      let topicIds: number[] | undefined;
      if (dto.topicIds !== undefined) {
        topicIds = await this.assertTopicsBelongToSubject(
          manager,
          subjectKey,
          dto.topicIds,
        );
      }

      await manager.update(
        CoverageEvent,
        { eventId, userId: user.userId },
        {
          coverageDate: newDate ?? event.coverageDate,
          notes:
            dto.notes !== undefined ? this.cleanNotes(dto.notes) : event.notes,
        },
      );

      if (topicIds) {
        await manager.delete(CoverageEventTopic, { eventId });
        await manager.insert(
          CoverageEventTopic,
          topicIds.map((topicId) => ({ eventId, topicId })),
        );
      }
    });

    return this.getEvent(user, eventId);
  }

  /** Deletes the event and its topic links only (cascade); academic data is untouched. */
  async deleteEvent(
    user: SafeUser,
    eventId: number,
  ): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      await this.loadOwnedEvent(manager, user, eventId);
      await manager.delete(CoverageEvent, { eventId, userId: user.userId });
    });
    return { message: `Coverage event #${eventId} deleted` };
  }

  /**
   * Removes one topic from every coverage event of this user in the subject
   * (explicit "un-cover"). Events left without topics are deleted. Returns the
   * affected events so the client can report exactly what changed.
   */
  async uncoverTopic(
    user: SafeUser,
    subjectKey: number,
    topicId: number,
  ): Promise<{
    affected: { eventId: number; coverageDate: string; deleted: boolean }[];
  }> {
    await this.assertSubjectAccess(user, subjectKey);

    const affected = await this.dataSource.transaction(async (manager) => {
      await this.assertTopicsBelongToSubject(manager, subjectKey, [topicId]);

      const events: { eventId: number | string; coverageDate: string }[] =
        await manager.query(
          `SELECT e.eventId AS eventId,
                  DATE_FORMAT(e.coverageDate, '%Y-%m-%d') AS coverageDate
             FROM CoverageEvent e
             JOIN CoverageEventTopic et ON et.eventId = e.eventId
            WHERE e.userId = ? AND e.subjectKey = ? AND et.topicId = ?
            ORDER BY e.coverageDate ASC, e.eventId ASC`,
          [user.userId, subjectKey, topicId],
        );

      const result: {
        eventId: number;
        coverageDate: string;
        deleted: boolean;
      }[] = [];
      for (const ev of events) {
        const id = Number(ev.eventId);
        await manager.delete(CoverageEventTopic, { eventId: id, topicId });
        const left: { n: number | string }[] = await manager.query(
          'SELECT COUNT(*) AS n FROM CoverageEventTopic WHERE eventId = ?',
          [id],
        );
        const deleted = Number(left[0]?.n ?? 0) === 0;
        if (deleted) {
          await manager.delete(CoverageEvent, { eventId: id });
        }
        result.push({ eventId: id, coverageDate: ev.coverageDate, deleted });
      }
      return result;
    });

    return { affected };
  }
}
