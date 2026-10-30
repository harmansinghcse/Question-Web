import { BadRequestException } from '@nestjs/common';
import { COVERAGE_DATE_PATTERN } from './dto/coverage-event.dto';

/**
 * Formats a UTC Date into 'YYYY-MM-DD'.
 */
export function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validates a 'YYYY-MM-DD' calendar date and returns it unchanged.
 * Dates are kept as plain strings end-to-end so no timezone conversion can
 * shift them by a day. Dates more than one day ahead of the server's UTC
 * date are rejected (the 1-day slack covers clients ahead of UTC).
 */
export function assertCoverageDate(
  value: string,
  now: Date = new Date(),
): string {
  if (typeof value !== 'string' || !COVERAGE_DATE_PATTERN.test(value)) {
    throw new BadRequestException('Date must be in YYYY-MM-DD format');
  }
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d ||
    y < 2000
  ) {
    throw new BadRequestException(`"${value}" is not a valid date`);
  }
  const limit =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
    24 * 60 * 60 * 1000;
  if (parsed.getTime() > limit) {
    throw new BadRequestException('Coverage date cannot be in the future');
  }
  return value;
}

export type ChapterStatus = 'COVERED' | 'PARTIAL' | 'UNCOVERED' | 'EMPTY';

export interface TreeRow {
  chapterId: number | string;
  chapterNo: number | string;
  chapterName: string;
  topicId: number | string | null;
  topicName: string | null;
  firstDate: string | null;
  lastDate: string | null;
  times: number | string | null;
}

export interface TreeTopic {
  topicId: number;
  topicName: string;
  covered: boolean;
  firstCoveredDate: string | null;
  lastCoveredDate: string | null;
  timesCovered: number;
}

export interface TreeChapter {
  chapterId: number;
  chapterNo: number;
  chapterName: string;
  totalTopics: number;
  coveredTopics: number;
  status: ChapterStatus;
  topics: TreeTopic[];
}

export interface TreeStats {
  totalChapters: number;
  totalTopics: number;
  coveredTopics: number;
  remainingTopics: number;
  coveragePercent: number;
  chaptersCovered: number;
  chaptersPartial: number;
  chaptersUncovered: number;
  chaptersEmpty: number;
}

export interface RawEventTopicActivityRow {
  eventId: number | string;
  coverageDate: string;
  topicId: number | string;
}

export interface WeeklyActivityBucket {
  weekStart: string;
  weekEnd: string;
  label: string;
  eventCount: number;
  uniqueTopicsTouched: number;
  newlyCoveredTopics: number;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Builds the chapter/topic tree and statistics from the joined rows.
 * Coverage is counted per unique topic, so revisiting a topic never inflates
 * the percentage. A chapter is COVERED only when every one of its topics is.
 */
export function buildTree(rows: TreeRow[]): {
  chapters: TreeChapter[];
  stats: TreeStats;
} {
  const chapters: TreeChapter[] = [];
  const byId = new Map<number, TreeChapter>();

  for (const r of rows) {
    const chapterId = Number(r.chapterId);
    let chapter = byId.get(chapterId);
    if (!chapter) {
      chapter = {
        chapterId,
        chapterNo: Number(r.chapterNo),
        chapterName: r.chapterName,
        totalTopics: 0,
        coveredTopics: 0,
        status: 'EMPTY',
        topics: [],
      };
      byId.set(chapterId, chapter);
      chapters.push(chapter);
    }
    if (r.topicId === null || r.topicId === undefined) continue;

    const times = Number(r.times ?? 0);
    chapter.topics.push({
      topicId: Number(r.topicId),
      topicName: r.topicName ?? '',
      covered: times > 0,
      firstCoveredDate: times > 0 ? r.firstDate : null,
      lastCoveredDate: times > 0 ? r.lastDate : null,
      timesCovered: times,
    });
  }

  const stats: TreeStats = {
    totalChapters: chapters.length,
    totalTopics: 0,
    coveredTopics: 0,
    remainingTopics: 0,
    coveragePercent: 0,
    chaptersCovered: 0,
    chaptersPartial: 0,
    chaptersUncovered: 0,
    chaptersEmpty: 0,
  };

  for (const c of chapters) {
    c.totalTopics = c.topics.length;
    c.coveredTopics = c.topics.filter((t) => t.covered).length;
    if (c.totalTopics === 0) c.status = 'EMPTY';
    else if (c.coveredTopics === c.totalTopics) c.status = 'COVERED';
    else if (c.coveredTopics === 0) c.status = 'UNCOVERED';
    else c.status = 'PARTIAL';

    stats.totalTopics += c.totalTopics;
    stats.coveredTopics += c.coveredTopics;
    if (c.status === 'COVERED') stats.chaptersCovered++;
    else if (c.status === 'PARTIAL') stats.chaptersPartial++;
    else if (c.status === 'UNCOVERED') stats.chaptersUncovered++;
    else stats.chaptersEmpty++;
  }

  stats.remainingTopics = stats.totalTopics - stats.coveredTopics;
  stats.coveragePercent =
    stats.totalTopics > 0
      ? Math.round((stats.coveredTopics / stats.totalTopics) * 1000) / 10
      : 0;

  return { chapters, stats };
}

/**
 * Computes trailing Monday-Sunday weekly coverage buckets ending on the week
 * of `referenceDate` ('YYYY-MM-DD'). Distinguishes:
 * - eventCount: distinct coverage sessions in that week
 * - uniqueTopicsTouched: distinct topics covered/revisited in that week
 * - newlyCoveredTopics: topics whose earliest coverageDate falls in that week
 */
export function buildWeeklyActivity(
  rows: RawEventTopicActivityRow[],
  referenceDate: string,
  weeksCount = 6,
): WeeklyActivityBucket[] {
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  const refUtc = new Date(Date.UTC(ry, rm - 1, rd));
  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const dayOffsetFromMon = (refUtc.getUTCDay() + 6) % 7;
  const currentMondayMs =
    refUtc.getTime() - dayOffsetFromMon * 24 * 60 * 60 * 1000;

  // Earliest coverage date per topic across all valid events <= referenceDate
  const firstCoveredByTopic = new Map<number, string>();
  for (const r of rows) {
    if (r.coverageDate > referenceDate) continue;
    const tid = Number(r.topicId);
    const prev = firstCoveredByTopic.get(tid);
    if (!prev || r.coverageDate < prev) {
      firstCoveredByTopic.set(tid, r.coverageDate);
    }
  }

  const buckets: WeeklyActivityBucket[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const startDateObj = new Date(
      currentMondayMs - i * 7 * 24 * 60 * 60 * 1000,
    );
    const endDateObj = new Date(
      startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000,
    );
    const weekStart = formatUtcDate(startDateObj);
    const weekEnd = formatUtcDate(endDateObj);
    const effectiveEnd = weekEnd > referenceDate ? referenceDate : weekEnd;

    const eventsSet = new Set<number>();
    const touchedTopicsSet = new Set<number>();
    const newlyCoveredSet = new Set<number>();

    for (const r of rows) {
      if (r.coverageDate >= weekStart && r.coverageDate <= effectiveEnd) {
        const eid = Number(r.eventId);
        const tid = Number(r.topicId);
        eventsSet.add(eid);
        touchedTopicsSet.add(tid);
        if (firstCoveredByTopic.get(tid) === r.coverageDate) {
          newlyCoveredSet.add(tid);
        }
      }
    }

    const label = `${SHORT_MONTHS[startDateObj.getUTCMonth()]} ${startDateObj.getUTCDate()}`;
    buckets.push({
      weekStart,
      weekEnd,
      label,
      eventCount: eventsSet.size,
      uniqueTopicsTouched: touchedTopicsSet.size,
      newlyCoveredTopics: newlyCoveredSet.size,
    });
  }

  return buckets;
}
