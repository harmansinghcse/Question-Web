import { BadRequestException } from '@nestjs/common';
import {
  assertCoverageDate,
  buildTree,
  buildWeeklyActivity,
  TreeRow,
} from './syllabus-tracker.util';

describe('assertCoverageDate', () => {
  const now = new Date('2026-10-29T10:00:00Z');

  it('accepts valid dates, today and the day before', () => {
    expect(assertCoverageDate('2026-10-29', now)).toBe('2026-10-29');
    expect(assertCoverageDate('2026-10-28', now)).toBe('2026-10-28');
  });

  it('allows tomorrow (client ahead of UTC) but not later', () => {
    expect(assertCoverageDate('2026-10-30', now)).toBe('2026-10-30');
    expect(() => assertCoverageDate('2026-10-31', now)).toThrow(
      BadRequestException,
    );
  });

  it('rejects malformed and impossible dates', () => {
    for (const bad of ['29-10-2026', '2026-13-01', '2026-02-30', '', 'abc']) {
      expect(() => assertCoverageDate(bad, now)).toThrow(BadRequestException);
    }
    expect(() => assertCoverageDate('1999-12-31', now)).toThrow(
      BadRequestException,
    );
  });
});

describe('buildTree', () => {
  const row = (
    chapterId: number,
    topicId: number | null,
    times = 0,
    first: string | null = null,
    last: string | null = null,
  ): TreeRow => ({
    chapterId,
    chapterNo: chapterId,
    chapterName: `Chapter ${chapterId}`,
    topicId,
    topicName: topicId === null ? null : `Topic ${topicId}`,
    firstDate: first,
    lastDate: last,
    times,
  });

  it('classifies chapters and counts unique topics only', () => {
    const { chapters, stats } = buildTree([
      row(1, 11, 3, '2026-10-29', '2026-11-02'), // revisited 3 times
      row(1, 12, 1, '2026-10-29', '2026-10-29'),
      row(2, 21, 1, '2026-10-30', '2026-10-30'),
      row(2, 22, 0),
      row(3, 31, 0),
      row(4, null), // chapter without topics
    ]);

    expect(chapters.map((c) => c.status)).toEqual([
      'COVERED',
      'PARTIAL',
      'UNCOVERED',
      'EMPTY',
    ]);
    expect(stats).toMatchObject({
      totalChapters: 4,
      totalTopics: 5,
      coveredTopics: 3, // revisits do not inflate this
      remainingTopics: 2,
      coveragePercent: 60,
      chaptersCovered: 1,
      chaptersPartial: 1,
      chaptersUncovered: 1,
      chaptersEmpty: 1,
    });
  });

  it('exposes covered dates only for covered topics', () => {
    const { chapters } = buildTree([
      row(1, 11, 2, '2026-10-29', '2026-10-31'),
      row(1, 12, 0, '2026-10-29', '2026-10-29'),
    ]);
    expect(chapters[0].topics[0]).toMatchObject({
      covered: true,
      firstCoveredDate: '2026-10-29',
      lastCoveredDate: '2026-10-31',
      timesCovered: 2,
    });
    expect(chapters[0].topics[1]).toMatchObject({
      covered: false,
      firstCoveredDate: null,
    });
  });

  it('coerces string counts from the database driver', () => {
    const { stats } = buildTree([
      { ...row(1, 11), times: '2', chapterId: '1', topicId: '11' },
    ]);
    expect(stats.coveredTopics).toBe(1);
  });

  it('handles an empty subject', () => {
    const { chapters, stats } = buildTree([]);
    expect(chapters).toEqual([]);
    expect(stats.coveragePercent).toBe(0);
  });
});

describe('buildWeeklyActivity', () => {
  it('separates event count, touched topics, and newly covered topics without revisit inflation', () => {
    // 2026-10-29 is Thursday (week starting Mon 2026-10-26)
    // Prior week started Mon 2026-10-19
    const rows = [
      { eventId: 1, coverageDate: '2026-10-20', topicId: 101 },
      { eventId: 1, coverageDate: '2026-10-20', topicId: 102 },
      // Revisited topic 101 + newly covered topic 103 in current week
      { eventId: 2, coverageDate: '2026-10-29', topicId: 101 },
      { eventId: 2, coverageDate: '2026-10-29', topicId: 103 },
      // Event after cutoff (2026-10-30) should be ignored when referenceDate is 2026-10-29
      { eventId: 3, coverageDate: '2026-10-30', topicId: 104 },
    ];

    const buckets = buildWeeklyActivity(rows, '2026-10-29', 3);
    expect(buckets).toHaveLength(3);

    const prevWeek = buckets[1];
    expect(prevWeek).toMatchObject({
      weekStart: '2026-10-19',
      eventCount: 1,
      uniqueTopicsTouched: 2,
      newlyCoveredTopics: 2,
    });

    const curWeek = buckets[2];
    expect(curWeek).toMatchObject({
      weekStart: '2026-10-26',
      eventCount: 1,
      uniqueTopicsTouched: 2, // 101 + 103
      newlyCoveredTopics: 1, // only 103 is new; 101 was first covered Oct 20
    });
  });
});
