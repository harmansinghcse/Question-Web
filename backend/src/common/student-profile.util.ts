/**
 * Academic Calendar configuration and SVNIT student email parser.
 *
 * SVNIT Email Format:
 *   [U|u][2-digit admission year][2-4 letter department code][roll digits]@domain
 *   Example: U25CS044@coed.svnit.ac.in
 *     - U  = Undergraduate (B.Tech)
 *     - 25 = 2025 Admission batch
 *     - CS = Computer Science and Engineering
 *     - 044 = Roll number portion
 */

export interface AcademicCalendarConfig {
  /** Month index (0 = Jan, 6 = July) when the Odd semester (Autumn term) begins. Default: 6 (July) */
  oddSemesterStartMonth: number;
  /** Month index (0 = Jan) when the Even semester (Spring term) begins. Default: 0 (January) */
  evenSemesterStartMonth: number;
  /** Maximum regular semesters for an undergraduate degree. Default: 8 */
  maxUndergraduateSemesters: number;
}

export const DEFAULT_ACADEMIC_CALENDAR_CONFIG: AcademicCalendarConfig = {
  oddSemesterStartMonth: 6, // July
  evenSemesterStartMonth: 0, // January
  maxUndergraduateSemesters: 8,
};

export interface StudentProfile {
  isUndergraduate: boolean;
  admissionYear: number;
  deptCode: string;
  deptId?: number;
  rollNumber: string;
  rawSemester: number;
  currentSemester: number;
  isOddSemester: boolean;
  isGraduated: boolean;
  academicYearLabel: string;
}

/**
 * Mapping of known SVNIT department codes to existing Department entity IDs.
 */
export const DEPT_CODE_TO_ID: Record<string, number> = {
  CS: 1, // Computer Science and Engineering
  CO: 1, // Alternate code for Computer Engineering
  AI: 2, // Artificial Intelligence
  DS: 2, // Data Science
};

/**
 * Parses an authenticated student email and dynamically calculates their expected
 * current semester using the current date and college academic calendar rules.
 *
 * @param email - College email address (e.g. U25CS044@coed.svnit.ac.in)
 * @param now - Dynamic reference date (defaults to `new Date()`)
 * @param config - Configurable calendar rules
 * @returns StudentProfile if email matches SVNIT UG pattern, or null if unsupported/invalid.
 */
export function parseStudentEmail(
  email?: string | null,
  now: Date = new Date(),
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CALENDAR_CONFIG,
): StudentProfile | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();
  // Matches initial U/u, 2 digits for year, 2-4 letters for dept, optional digits for roll, and @
  const match = trimmed.match(/^[uU](\d{2})([a-zA-Z]{2,4})(\d+)?@/);
  if (!match) {
    return null;
  }

  const rawYear = parseInt(match[1], 10);
  if (Number.isNaN(rawYear)) {
    return null;
  }

  // Two-digit year expansion: 25 -> 2025
  const admissionYear = 2000 + rawYear;
  const deptCode = match[2].toUpperCase();
  const rollNumber = match[3] || '';

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 to 11

  // Academic calendar logic:
  // Odd semester (Semesters 1, 3, 5, 7): July to December
  // Even semester (Semesters 2, 4, 6, 8): January to June
  const isOddSemester = currentMonth >= config.oddSemesterStartMonth;
  const yearDiff = currentYear - admissionYear;

  let calculatedSemester: number;

  if (yearDiff < 0 || (yearDiff === 0 && !isOddSemester)) {
    // Student enrolled for upcoming term before July start
    calculatedSemester = 1;
  } else if (isOddSemester) {
    // In Autumn term of (yearDiff + 1)-th academic year
    calculatedSemester = yearDiff * 2 + 1;
  } else {
    // In Spring term of (yearDiff)-th academic year
    calculatedSemester = yearDiff * 2;
  }

  const isGraduated = calculatedSemester > config.maxUndergraduateSemesters;
  const currentSemester = Math.max(
    1,
    Math.min(config.maxUndergraduateSemesters, calculatedSemester),
  );

  const startYear = isOddSemester ? currentYear : currentYear - 1;
  const academicYearLabel = `${startYear}–${startYear + 1}`;

  return {
    isUndergraduate: true,
    admissionYear,
    deptCode,
    deptId: DEPT_CODE_TO_ID[deptCode],
    rollNumber,
    rawSemester: calculatedSemester,
    currentSemester,
    isOddSemester,
    isGraduated,
    academicYearLabel,
  };
}
