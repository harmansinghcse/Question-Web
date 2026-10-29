import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SyllabusTrackerService } from './syllabus-tracker.service';
import { UserRole, AccountStatus } from '../users/entities/user.entity';
import type { SafeUser } from '../auth/interfaces/auth-response.interface';

const user = (over: Partial<SafeUser> = {}): SafeUser =>
  ({
    userId: 7,
    email: 'u25cs044@coed.svnit.ac.in',
    displayName: 'S',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as SafeUser;

function build(opts: { subjectDept?: number; userDept?: number | null } = {}) {
  const manager = {
    query: jest.fn(),
    insert: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    query: jest.fn(),
    transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
  };
  const subjectRepo = {
    findOneBy: jest.fn().mockResolvedValue(
      opts.subjectDept === -1
        ? null
        : {
            subjectKey: 5,
            subjectId: 'CS204',
            subjectName: 'Database Management Systems',
            semester: 3,
            credits: 4,
            deptId: opts.subjectDept ?? 1,
          },
    ),
  };
  const departments = {
    resolveFromEmail: jest.fn().mockResolvedValue(
      opts.userDept === null
        ? null
        : {
            deptId: opts.userDept ?? 1,
            deptName: 'Computer Science and Engineering',
          },
    ),
    findById: jest.fn().mockResolvedValue({
      deptId: opts.subjectDept ?? 1,
      deptName: 'Computer Science and Engineering',
    }),
  };
  const service = new SyllabusTrackerService(
    dataSource as never,
    subjectRepo as never,
    departments as never,
  );
  return { service, manager, dataSource };
}

const eventRow = {
  eventId: 1,
  subjectKey: 5,
  coverageDate: '2026-10-29',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SyllabusTrackerService', () => {
  describe('getContext', () => {
    it('resolves academic context from email and returns department-scoped subjects', async () => {
      const { service, dataSource } = build();
      dataSource.query.mockResolvedValueOnce([
        {
          subjectKey: 5,
          subjectId: 'CS204',
          deptId: 1,
          subjectName: 'Database Management Systems',
          credits: 4,
          semester: 3,
          totalChapters: 5,
          totalTopics: 20,
          coveredTopics: 5,
          eventCount: 2,
          lastCoverageDate: '2026-10-29',
        },
      ]);

      const ctx = await service.getContext(user());
      expect(ctx.academicContext).toMatchObject({
        deptId: 1,
        deptName: 'Computer Science and Engineering',
        deptCode: 'CS',
      });
      expect(ctx.subjects[0]).toMatchObject({
        subjectKey: 5,
        coveragePercent: 25,
        coveredTopics: 5,
        totalTopics: 20,
      });
    });

    it('rejects students whose department cannot be resolved', async () => {
      const { service } = build({ userDept: null });
      await expect(service.getContext(user())).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createEvent', () => {
    it('rejects subjects outside the student department', async () => {
      const { service } = build({ subjectDept: 2, userDept: 1 });
      await expect(
        service.createEvent(user(), {
          subjectKey: 5,
          coverageDate: '2026-10-29',
          topicIds: [1],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the student department cannot be resolved', async () => {
      const { service } = build({ userDept: null });
      await expect(
        service.createEvent(user(), {
          subjectKey: 5,
          coverageDate: '2026-10-29',
          topicIds: [1],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects topics that are not part of the subject', async () => {
      const { service, manager } = build();
      manager.query.mockResolvedValueOnce([{ topicId: 1 }]); // only topic 1 is valid
      await expect(
        service.createEvent(user(), {
          subjectKey: 5,
          coverageDate: '2026-10-29',
          topicIds: [1, 999],
        }),
      ).rejects.toThrow(/999/);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('rejects an invalid date before touching the database', async () => {
      const { service, dataSource } = build();
      await expect(
        service.createEvent(user(), {
          subjectKey: 5,
          coverageDate: '2026-02-30',
          topicIds: [1],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects an identical same-day record (double submit)', async () => {
      const { service, manager } = build();
      manager.query
        .mockResolvedValueOnce([{ topicId: 1 }, { topicId: 2 }]) // topics valid
        .mockResolvedValueOnce([{ eventId: 3, ids: '1,2' }]); // same-day event
      await expect(
        service.createEvent(user(), {
          subjectKey: 5,
          coverageDate: '2026-10-29',
          topicIds: [2, 1, 2],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('stores the event and de-duplicated topics for the token user', async () => {
      const { service, manager, dataSource } = build();
      manager.query
        .mockResolvedValueOnce([{ topicId: 1 }, { topicId: 2 }])
        .mockResolvedValueOnce([]);
      manager.insert
        .mockResolvedValueOnce({ identifiers: [{ eventId: 1 }] })
        .mockResolvedValueOnce({});
      dataSource.query
        .mockResolvedValueOnce([eventRow]) // loadOwnedEvent
        .mockResolvedValueOnce([
          {
            eventId: 1,
            topicId: 1,
            topicName: 'A',
            chapterId: 1,
            chapterNo: 1,
            chapterName: 'C1',
          },
        ]);

      const res = await service.createEvent(user(), {
        subjectKey: 5,
        coverageDate: '2026-10-29',
        notes: '  covered joins  ',
        topicIds: [1, 2, 2],
      });

      const [, eventValues] = manager.insert.mock.calls[0];
      expect(eventValues).toMatchObject({
        userId: 7,
        subjectKey: 5,
        coverageDate: '2026-10-29',
        notes: 'covered joins',
      });
      expect(manager.insert.mock.calls[1][1]).toEqual([
        { eventId: 1, topicId: 1 },
        { eventId: 1, topicId: 2 },
      ]);
      expect(res.eventId).toBe(1);
    });
  });

  describe('ownership', () => {
    it('returns 404 for events not owned by the user', async () => {
      const { service, dataSource } = build();
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.getEvent(user(), 42)).rejects.toThrow(
        NotFoundException,
      );
      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('userId = ?');
      expect(params).toEqual([42, 7]);
    });

    it('does not delete events of other users', async () => {
      const { service, manager } = build();
      manager.query.mockResolvedValueOnce([]);
      await expect(service.deleteEvent(user(), 42)).rejects.toThrow(
        NotFoundException,
      );
      expect(manager.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    it('replaces the topic set only after validating it', async () => {
      const { service, manager, dataSource } = build();
      manager.query
        .mockResolvedValueOnce([eventRow]) // loadOwnedEvent
        .mockResolvedValueOnce([{ topicId: 4 }]); // topics valid
      dataSource.query
        .mockResolvedValueOnce([eventRow])
        .mockResolvedValueOnce([]);

      await service.updateEvent(user(), 1, {
        coverageDate: '2026-10-28',
        topicIds: [4],
      });

      expect(manager.update).toHaveBeenCalledWith(
        expect.anything(),
        { eventId: 1, userId: 7 },
        { coverageDate: '2026-10-28', notes: null },
      );
      expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
        eventId: 1,
      });
      expect(manager.insert.mock.calls[0][1]).toEqual([
        { eventId: 1, topicId: 4 },
      ]);
    });

    it('keeps existing topics when topicIds is omitted', async () => {
      const { service, manager, dataSource } = build();
      manager.query.mockResolvedValueOnce([eventRow]);
      dataSource.query
        .mockResolvedValueOnce([eventRow])
        .mockResolvedValueOnce([]);
      await service.updateEvent(user(), 1, { notes: 'x' });
      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('uncoverTopic', () => {
    it('removes the topic from its events and deletes emptied events', async () => {
      const { service, manager } = build();
      manager.query
        .mockResolvedValueOnce([{ topicId: 9 }]) // topic belongs to subject
        .mockResolvedValueOnce([
          { eventId: 1, coverageDate: '2026-10-29' },
          { eventId: 2, coverageDate: '2026-10-31' },
        ])
        .mockResolvedValueOnce([{ n: 0 }]) // event 1 now empty
        .mockResolvedValueOnce([{ n: 2 }]); // event 2 keeps other topics

      const res = await service.uncoverTopic(user(), 5, 9);

      expect(res.affected).toEqual([
        { eventId: 1, coverageDate: '2026-10-29', deleted: true },
        { eventId: 2, coverageDate: '2026-10-31', deleted: false },
      ]);
      const deletedEvents = manager.delete.mock.calls.filter(
        ([, where]) => where.topicId === undefined,
      );
      expect(deletedEvents).toHaveLength(1);
      expect(deletedEvents[0][1]).toEqual({ eventId: 1 });
    });
  });

  describe('getTree', () => {
    it('applies the as-of date filter, scopes to user/subject, and returns weekly activity', async () => {
      const { service, dataSource } = build();
      dataSource.query
        .mockResolvedValueOnce([
          {
            chapterId: 1,
            chapterNo: 1,
            chapterName: 'C1',
            topicId: 11,
            topicName: 'T',
            firstDate: '2026-10-29',
            lastDate: '2026-10-29',
            times: 1,
          },
        ])
        .mockResolvedValueOnce([{ eventCount: 1, lastDate: '2026-10-29' }])
        .mockResolvedValueOnce([
          { eventId: 1, coverageDate: '2026-10-29', topicId: 11 },
        ]);

      const tree = await service.getTree(user(), 5, '2026-10-29');

      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('e.coverageDate <= ?');
      expect(params).toEqual([7, 5, '2026-10-29', 5]);
      expect(tree.asOf).toBe('2026-10-29');
      expect(tree.weeklyActivity).toHaveLength(6);
      expect(tree.weeklyActivity[5]).toMatchObject({
        eventCount: 1,
        uniqueTopicsTouched: 1,
        newlyCoveredTopics: 1,
      });
      expect(tree.stats).toMatchObject({
        coveredTopics: 1,
        coveragePercent: 100,
        eventCount: 1,
        lastCoverageDate: '2026-10-29',
      });
    });

    it('omits the date filter when no as-of date is given', async () => {
      const { service, dataSource } = build();
      dataSource.query.mockResolvedValue([]);
      await service.getTree(user(), 5);
      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).not.toContain('e.coverageDate <= ?');
      expect(params).toEqual([7, 5, 5]);
    });

    it('rejects a malformed as-of date', async () => {
      const { service } = build();
      await expect(service.getTree(user(), 5, '29/10/2026')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns 404 for an unknown subject', async () => {
      const { service } = build({ subjectDept: -1 });
      await expect(service.getTree(user(), 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
