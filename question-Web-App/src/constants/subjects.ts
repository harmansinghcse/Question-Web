import type { Subject } from '../services/api';
import { parseStudentEmail, type StudentProfile } from '../utils/student-profile';

export { parseStudentEmail, type StudentProfile };

/**
 * Shared presentation helpers for subjects coming from GET /api/subjects.
 *
 * Colours are derived from the stable `subjectKey` (not list position) so the
 * same subject keeps the same colour on every screen.
 */

const SUBJECT_COLOURS = [
  '#9275F5',
  '#A78BFA',
  '#7457D9',
  '#818CF8',
  '#6366F1',
  '#38BDF8',
  '#34D399',
] as const;

/** Exact subject code → icon. */
const ICON_BY_CODE: Record<string, string> = {
  DBMS: '▤', OOP: '</>', DAA: '⌘', CO: '▦', DM: 'Σ',
  OS: '⚙', CN: '⬡', DS: '◈', SE: '⚒', AI: '✦',
};

/** Keyword in subject name → icon (checked in order). */
const ICON_BY_KEYWORD: [RegExp, string][] = [
  [/database|dbms|sql/i, '▤'],
  [/object|oop|java|c\+\+|programming/i, '</>'],
  [/algorithm/i, '⌘'],
  [/data structure/i, '◈'],
  [/architecture|organi[sz]ation/i, '▦'],
  [/discrete|math|calculus|algebra|statistic|probability/i, 'Σ'],
  [/operating system/i, '⚙'],
  [/network/i, '⬡'],
  [/software/i, '⚒'],
  [/artificial|intelligence|machine learning|\bml\b|\bai\b/i, '✦'],
  [/physics/i, '⚛'],
  [/chemistry/i, '⚗'],
  [/electr/i, '⚡'],
  [/web/i, '◎'],
];

export function subjectColour(subject: Pick<Subject, 'subjectKey'>): string {
  const key = Math.abs(Math.trunc(subject.subjectKey || 0));
  return SUBJECT_COLOURS[key % SUBJECT_COLOURS.length];
}

/** Trimmed subject code (DB column is CHAR(5), so it may be space-padded). */
export function subjectCode(subject: Pick<Subject, 'subjectId'>): string {
  return (subject.subjectId ?? '').trim().toUpperCase();
}

/** Human-readable name, falling back to the subject code. */
export function subjectDisplayName(
  subject: Pick<Subject, 'subjectName' | 'subjectId'>,
): string {
  const name = subject.subjectName?.trim();
  return name ? name : subjectCode(subject) || 'Untitled subject';
}

export function subjectIcon(
  subject: Pick<Subject, 'subjectName' | 'subjectId'>,
): string {
  const code = subjectCode(subject);
  if (ICON_BY_CODE[code]) return ICON_BY_CODE[code];

  const name = subject.subjectName ?? '';
  for (const [pattern, icon] of ICON_BY_KEYWORD) {
    if (pattern.test(name)) return icon;
  }

  // Fallback: initials of the name (max 2 letters), else first 2 chars of code.
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(and|of|the|to|in|for)$/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 2);

  return initials || code.slice(0, 2) || '◉';
}

/** Sort by semester, then name — null names sorted last. */
export function sortSubjects(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    if (a.semester !== b.semester) return (a.semester ?? 0) - (b.semester ?? 0);
    return subjectDisplayName(a).localeCompare(subjectDisplayName(b));
  });
}

/** "Sem 3 · 4 credits" style meta line. */
export function subjectMeta(subject: Pick<Subject, 'semester' | 'credits'>): string {
  const parts: string[] = [];
  if (subject.semester) parts.push(`Sem ${subject.semester}`);
  if (subject.credits != null) {
    parts.push(`${subject.credits} ${subject.credits === 1 ? 'credit' : 'credits'}`);
  }
  return parts.join(' · ');
}

/**
 * Filters a list of subjects to match a student's department and semester.
 */
export function filterSubjectsForStudent(
  subjects: Subject[],
  profile: StudentProfile | null,
): Subject[] {
  if (!profile) return subjects;

  return subjects.filter((subject) => {
    // 1. Must match student's calculated current semester
    if (subject.semester !== profile.currentSemester) {
      return false;
    }

    // 2. Department check (if department mapping is available)
    if (profile.deptId && subject.deptId === profile.deptId) {
      return true;
    }

    // 3. Fallback: subject ID starts with department code (e.g. CS...)
    if (profile.deptCode && subjectCode(subject).startsWith(profile.deptCode)) {
      return true;
    }

    // If subject has general department or no strict mismatch, match by semester
    return !subject.deptId || subject.deptId === profile.deptId;
  });
}
